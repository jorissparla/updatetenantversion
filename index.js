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
// const url = 'http://nlbavwixs.infor.com:4000';
const url = 'http://localhost:4000';
// const eu = require('./data/us.json');

const query = `{ 
  tenants {
    id
    name
    packagecombination
    version
    farm
  }}`;

const mutation = `
  mutation updateTenantVersion($name: String!, $packagecombination:String!) {
    updateTenantVersion(input: {name: $name, packagecombination:$packagecombination}) {
      id
      name
      packagecombination
      version
    }
  }
  `;

const newTenant = `
  mutation addTenant($name: String!, $packagecombination:String!, $farm: String!, $customername:String){
    createTenant(input:{name: $name, packagecombination:$packagecombination, farm:$farm, customername: $customername}) {
       id
      name
      packagecombination
      version
    }
  }
  
  `;

const updateUpdateStatus = `
    mutation updateUpdateStatus {
      updateUpdateStatus (name: "TenantList") {
        id
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

  const { tenants } = await request(url, query);

  fileTenants.map(async ft => {
    const aTen = tenants.find(t => t.name === ft.Tenant);
    let farmName = ft['Farm Name'];
    let customername = ft['customername'];
    let packagecombination;
    let farm =
      farmName === 'euce1prda' ? 'Frankfurt' : farmName === 'usea1prda' ? 'Us-East-1' : 'Sydney';
    const pk = ft['Pck. Comb.'];
    if (pk.startsWith("'")) {
      packagecombination = ft['Pck. Comb.'].split("'")[1]; //|| ft['Pck. Comb.'];
    } else {
      packagecombination = ft['Pck. Comb.'];
    }
    if (aTen) {
      // Found an Existing Tenant, update the version
      // console.log('-' + aTen.packagecombination + '-', '-' + ft['Pck. Comb.'] + '-');
      if ("'" + aTen.packagecombination + "'" !== ft['Pck. Comb.']) {
        try {
          //console.log('-' + packagecombination + '-' === '-' + ft['Pck. Comb.'] + '-');
          console.log('Changed', ft.Tenant, ft['Pck. Comb.'], packagecombination, ft['Pck. Comb.']);
          await request(url, mutation, { name: ft.Tenant, packagecombination });
        } catch (error) {
          console.log(error);
        }
      } else {
        // console.log('No changes for :', ft.Tenant, 'on farm', farm);
      }
    } else {
      try {
        //  packagecombination = ft['Pck. Comb.'].split("'")[1];
        console.log('Not Found ', ft.Tenant, farm, packagecombination, ft['Pck. Comb.']);
        await request(url, newTenant, { name: ft.Tenant, packagecombination, farm, customername });
      } catch (e) {
        console.log('Something went wrong with creating the tenant  ' + ft.Tenant, e);
      }
    }
  });
  const result = await request(url, updateUpdateStatus);
  console.log(farm, new Date(parseInt(result.updateUpdateStatus.updatedAt)));
}

run('euce1prda');
run('usea1prda');
run('apse2prda');
