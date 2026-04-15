importScripts('db.js', 'queryEngine.js');

const DEPARTMENTS = [
  'Engineering', 'Marketing', 'Sales', 'HR', 'Finance',
  'Operations', 'Legal', 'Design', 'Product', 'Support',
];
const STATUSES = ['active', 'inactive'];
const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer',
  'Michael', 'Linda', 'William', 'Barbara', 'David', 'Susan', 'Richard', 'Jessica',
  'Joseph', 'Sarah', 'Thomas', 'Karen', 'Charles', 'Lisa', 'Christopher', 'Nancy',
  'Daniel', 'Betty', 'Matthew', 'Margaret', 'Anthony', 'Sandra', 'Mark', 'Ashley'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
  'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRecords(count) {
  const records = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const dept = pick(DEPARTMENTS);
    const deptSlug = dept.toLowerCase().replace(/\s+/g, '');

    records.push({
      id: crypto.randomUUID(),
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 900 + 100)}@${deptSlug}.corp`,
      department: dept,
      salary: Math.floor(Math.random() * 150_000 + 30_000),
      status: STATUSES[Math.floor(Math.random() * 2)],
      createdAt: new Date(now - Math.random() * 3 * 365 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10),
    });
  }

  return records;
}

let indexBuildPromise = null;
// Incremented on CLEAR_ALL to invalidate any in-flight getAllLight() result
let indexGeneration = 0;

async function ensureIndex() {
  if (index.status === 'ready') return;

  if (indexBuildPromise) {
    await indexBuildPromise;
    return;
  }

  index.status = 'building';
  const capturedGen = indexGeneration;

  indexBuildPromise = (async () => {
    self.postMessage({ action: 'INDEX_STATUS', payload: { status: 'building', size: 0 } });
    const records = await getAllLight();

    if (capturedGen !== indexGeneration) {
      indexBuildPromise = null;
      return;
    }

    buildIndex(records);
    self.postMessage({ action: 'INDEX_STATUS', payload: { status: 'ready', size: index.size } });
    indexBuildPromise = null;
  })();

  await indexBuildPromise;
}

self.onmessage = async (event) => {
  const { requestId, action, payload } = event.data;

  try {
    switch (action) {
      case 'QUERY': {
        await ensureIndex();
        const result = search(payload.filters, payload.sort, payload.page, payload.pageSize);
        self.postMessage({ requestId, action: 'QUERY_RESULT', payload: result });
        break;
      }

      case 'BULK_INSERT': {
        const count = payload.count || 1000;
        const records = generateRecords(count);

        await bulkInsert(records, (progress) => {
          self.postMessage({ requestId, action: 'BULK_INSERT_PROGRESS', payload: progress });
        });

        if (index.status === 'ready') {
          appendToIndex(records);
          self.postMessage({ action: 'INDEX_STATUS', payload: { status: 'ready', size: index.size } });
        } else {
          index.status = 'building';
          const all = await getAllLight();
          buildIndex(all);
          self.postMessage({ action: 'INDEX_STATUS', payload: { status: 'ready', size: index.size } });
        }

        const total = await countRecords();
        self.postMessage({
          requestId,
          action: 'BULK_INSERT_RESULT',
          payload: { success: true, inserted: count, total },
        });
        break;
      }

      case 'DELETE_RECORDS': {
        const ids = payload.ids;
        await deleteByIds(ids);

        if (index.status === 'ready') {
          removeFromIndex(new Set(ids));
        }

        const total = await countRecords();
        self.postMessage({
          requestId,
          action: 'DELETE_RESULT',
          payload: { success: true, deleted: ids.length, total },
        });
        break;
      }

      case 'GET_STATS': {
        const total = await countRecords();
        const { status, size } = getIndexStatus();
        self.postMessage({
          requestId,
          action: 'STATS_RESULT',
          payload: { totalRecords: total, indexStatus: status, indexedRecords: size },
        });
        break;
      }

      case 'CLEAR_ALL': {
        indexGeneration++;
        indexBuildPromise = null;
        await clearAll();
        buildIndex([]);
        self.postMessage({ action: 'INDEX_STATUS', payload: { status: 'ready', size: 0 } });
        self.postMessage({ requestId, action: 'CLEAR_RESULT', payload: { success: true } });
        break;
      }

      case 'BUILD_INDEX': {
        index.status = 'empty';
        indexBuildPromise = null;
        await ensureIndex();
        const { status, size } = getIndexStatus();
        self.postMessage({ requestId, action: 'INDEX_STATUS', payload: { status, size } });
        break;
      }

      default:
        self.postMessage({
          requestId,
          action: 'ERROR',
          payload: { message: `Unknown action: ${action}` },
        });
    }
  } catch (err) {
    self.postMessage({
      requestId,
      action: 'ERROR',
      payload: { message: err.message || String(err) },
    });
  }
};
