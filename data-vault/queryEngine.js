const index = {
  ids: [],
  names: [],
  namesLower: [],
  emails: [],
  emailsLower: [],
  departments: [],
  statuses: [],
  salaries: null,   // Float64Array — avoids boxing overhead on numeric comparisons
  createdAts: [],
  size: 0,
  status: 'empty',  // 'empty' | 'building' | 'ready'
};

function buildIndex(records) {
  const n = records.length;
  index.ids = new Array(n);
  index.names = new Array(n);
  index.namesLower = new Array(n);
  index.emails = new Array(n);
  index.emailsLower = new Array(n);
  index.departments = new Array(n);
  index.statuses = new Array(n);
  index.salaries = new Float64Array(n);
  index.createdAts = new Array(n);

  for (let i = 0; i < n; i++) {
    const r = records[i];
    index.ids[i] = r.id;
    index.names[i] = r.name;
    index.namesLower[i] = r.name.toLowerCase();
    index.emails[i] = r.email;
    index.emailsLower[i] = r.email.toLowerCase();
    index.departments[i] = r.department;
    index.statuses[i] = r.status;
    index.salaries[i] = r.salary;
    index.createdAts[i] = r.createdAt;
  }

  index.size = n;
  index.status = 'ready';
}

function appendToIndex(records) {
  const prevSalaries = index.salaries;
  const newSize = index.size + records.length;
  const newSalaries = new Float64Array(newSize);
  if (prevSalaries) newSalaries.set(prevSalaries);

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const pos = index.size + i;
    index.ids[pos] = r.id;
    index.names[pos] = r.name;
    index.namesLower[pos] = r.name.toLowerCase();
    index.emails[pos] = r.email;
    index.emailsLower[pos] = r.email.toLowerCase();
    index.departments[pos] = r.department;
    index.statuses[pos] = r.status;
    newSalaries[pos] = r.salary;
    index.createdAts[pos] = r.createdAt;
  }

  index.salaries = newSalaries;
  index.size = newSize;
}

function removeFromIndex(idSet) {
  const keep = [];
  for (let i = 0; i < index.size; i++) {
    if (!idSet.has(index.ids[i])) keep.push(i);
  }

  const n = keep.length;
  const newSalaries = new Float64Array(n);
  const newIds = new Array(n);
  const newNames = new Array(n);
  const newNamesLower = new Array(n);
  const newEmails = new Array(n);
  const newEmailsLower = new Array(n);
  const newDepts = new Array(n);
  const newStatuses = new Array(n);
  const newCreatedAts = new Array(n);

  for (let j = 0; j < n; j++) {
    const i = keep[j];
    newIds[j] = index.ids[i];
    newNames[j] = index.names[i];
    newNamesLower[j] = index.namesLower[i];
    newEmails[j] = index.emails[i];
    newEmailsLower[j] = index.emailsLower[i];
    newDepts[j] = index.departments[i];
    newStatuses[j] = index.statuses[i];
    newSalaries[j] = index.salaries[i];
    newCreatedAts[j] = index.createdAts[i];
  }

  index.ids = newIds;
  index.names = newNames;
  index.namesLower = newNamesLower;
  index.emails = newEmails;
  index.emailsLower = newEmailsLower;
  index.departments = newDepts;
  index.statuses = newStatuses;
  index.salaries = newSalaries;
  index.createdAts = newCreatedAts;
  index.size = n;
}

function search(filters, sort, page, pageSize) {
  const t0 = performance.now();

  const searchStr = filters.search ? filters.search.toLowerCase().trim() : '';
  const deptFilter = filters.department || '';
  const statusFilter = filters.status || '';
  const salaryMin = filters.salaryMin != null ? filters.salaryMin : -Infinity;
  const salaryMax = filters.salaryMax != null ? filters.salaryMax : Infinity;

  const matched = [];
  const n = index.size;

  for (let i = 0; i < n; i++) {
    if (searchStr) {
      if (
        !index.namesLower[i].includes(searchStr) &&
        !index.emailsLower[i].includes(searchStr)
      ) continue;
    }
    if (deptFilter && index.departments[i] !== deptFilter) continue;
    if (statusFilter && index.statuses[i] !== statusFilter) continue;
    if (index.salaries[i] < salaryMin || index.salaries[i] > salaryMax) continue;
    matched.push(i);
  }

  const total = matched.length;

  if (sort && sort.field) {
    matched.sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      switch (sort.field) {
        case 'name':       return dir * index.namesLower[a].localeCompare(index.namesLower[b]);
        case 'email':      return dir * index.emailsLower[a].localeCompare(index.emailsLower[b]);
        case 'department': return dir * index.departments[a].localeCompare(index.departments[b]);
        case 'status':     return dir * index.statuses[a].localeCompare(index.statuses[b]);
        case 'salary':     return dir * (index.salaries[a] - index.salaries[b]);
        case 'createdAt':  return dir * index.createdAts[a].localeCompare(index.createdAts[b]);
        default:           return 0;
      }
    });
  }

  const start = page * pageSize;
  const slice = matched.slice(start, start + pageSize);

  const records = slice.map((i) => ({
    id: index.ids[i],
    name: index.names[i],
    email: index.emails[i],
    department: index.departments[i],
    status: index.statuses[i],
    salary: index.salaries[i],
    createdAt: index.createdAts[i],
  }));

  return { records, total, page, pageSize, queryTime: Math.round(performance.now() - t0) };
}

function getIndexStatus() {
  return { status: index.status, size: index.size };
}
