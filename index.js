const { request } = require('graphql-request');
const url = 'http://nlbavwixs.infor.com:4000';
const eu = require('./data/apj.json');
const fs = require('fs');

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

async function run() {
  const fileColumns = eu.results[0].series[0].columns;
  // console.log(fileColumns);
  const fromFile = eu.results[0].series[0].values;

  const fileTenants = fromFile
    .map(v => {
      const obj = {};
      fileColumns.map((col, index) => {
        obj[col] = v[index];
      });
      return obj;
    })
    .filter(o => o['Tenant Status'] !== 'deleted');
  console.log(fileTenants);

  const { tenants } = await request(url, query);

  fileTenants.map(async ft => {
    const aTen = tenants.find(t => t.name === ft.Tenant);
    if (aTen) {
      if ("'" + aTen.packagecombination + "'" !== ft['Pck. Comb.']) {
        const packagecombination = ft['Pck. Comb.'].split("'")[1] || ft['Pck. Comb.'];
        console.log(packagecombination, ft['Pck. Comb.']);
        console.log('Changed', ft.Tenant, ft['Pck. Comb.'], packagecombination);
        await request(url, mutation, { name: ft.Tenant, packagecombination });
      }
    } else {
      console.log('Not Found ', ft.Tenant);
    }
  });
}

run();
