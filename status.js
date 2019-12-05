const { request } = require('graphql-request');
const fetch = require('node-fetch');
const fs = require('fs');
let grafanaUrl =
  'https://grafana.monocle.infor.com/api/datasources/proxy/293/query?db=telegraf&q=SELECT%20%22tenantId%22%20AS%20%22Tenant%22%2C%20%22name%22%20AS%20%22Tenant%20Name%22%2C%20%22packComb%22%20AS%20%22Pck.%20Comb.%22%2C%20%22tenantStatus%22%20AS%20%22Tenant%20Status%22%2C%20%22operationalState%22%20AS%20%22Operational%20Status%22%2C%20%22processStatus%22%20AS%20%22Process%20Status%22%2C%20%22farmName%22%20AS%20%22Farm%20Name%22%20FROM%20%22eln-tenants-data%22%20WHERE%20(%22farmName%22%20%3D~%20%2F%5E{farm}%24%2F)%20AND%20time%20%3E%3D%20now()%20-%2012h&epoch=ms';
// 'https://grafana.monocle.infor.com/api/datasources/proxy/293/query?db=telegraf&q=SELECT%20%22tenantId%22%20AS%20%22Tenant%22%2C%20%22name%22%20AS%20%22Tenant%20Name%22%2C%20%22packComb%22%20AS%20%22Pck.%20Comb.%22%2C%20%22tenantStatus%22%20AS%20%22Tenant%20Status%22%2C%20%22operationalState%22%20AS%20%22Operational%20Status%22%2C%20%22processStatus%22%20AS%20%22Process%20Status%22%2C%20%22farmName%22%20AS%20%22Farm%20Name%22%20FROM%20%22eln-tenants-data%22%20WHERE%20(%22farmName%22%20%3D~%20%2F%5Eapse2prda%24%2F)%20AND%20time%20%3E%3D%20now()%20-%2012h&epoch=ms';

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization:
    'Bearer eyJrIjoiM3dra1hyTzRzak4xYkNEdEg3OGl4eHFrb3FUUTNtM0QiLCJuIjoiRUxOVmlldyIsImlkIjoyNH0='
};
const url = 'http://nlbavwixs.infor.com:4000';
// const url = 'http://localhost:4000';
// const eu = require('./data/us.json');

const updateTenantStatus = `
    mutation updateTenantStatus($input: UpdateTenantStatus) {
      updateTenantStatus (input: $input) {
 
        name
        tenant_status
        updatedAt
      }
    }
  `;

async function run(farm) {
  let results = null;
  try {
    // console.log(farm, '\r\n');
    const newgrafanaUrl = grafanaUrl.replace('{farm}', farm);
    const response = await fetch(newgrafanaUrl, {
      // credentials: 'include',
      // method: 'POST',
      // mode: 'no-cors',
      headers: headers
    });
    // const response = await result.json();
    ({ results } = await response.json());
  } catch (e) {
    console.log(e);
  }
  console.log(results, farm);
  const fileColumns = results[0].series[0].columns;
  // console.log(fileColumns);
  const fromFile = results[0].series[0].values;

  const fileTenants = fromFile
    .map(v => {
      const obj = {};
      fileColumns.map((col, index) => {
        obj[col] = v[index];
      });
      return obj;
    })
    .filter(o => o['Tenant Status'] !== 'deleted')
    .map(t => ({ ...t, customername: t['Tenant Name'] }));
  // console.log(fileTenants);
  fileTenants.map(async tenant => {
    const name = tenant['Tenant'];
    const tenant_status = tenant['Tenant Status'];
    const operational_status = tenant['Operational Status'];
    const process_status = tenant['Process Status'];
    const input = { name, tenant_status, operational_status, process_status };
    console.log(input);
    try {
      await request(url, updateTenantStatus, { input });
    } catch (e) {
      console.log(e);
    }
  });
}

run('euce1prda');
run('usea1prda');
run('apse2prda');
