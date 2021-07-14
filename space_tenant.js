const { request } = require("graphql-request");
const fetch = require("node-fetch");
const fs = require("fs");
require("dotenv").config();
let { BASEURL, TOKEN } = process.env;

// const query = 'SELECT * FROM "Tenant Upgrade" WHERE time >= now() - 6h GROUP BY "faro_deployment"'.replace(/"/gi, "%22").replace(/ /gi, "%20");
const customersquery = `SELECT sum("used_space") FROM "ElnDataVolume_V41" WHERE ("Farm" =~ /^{farm}$/) AND time >= now()-12h GROUP BY "Customer"`;
const tenantQuery = `SELECT sum("used_space") FROM "ElnDataVolume_V41" WHERE ("Farm" =~ /^{farm}$/) AND ("Customer" =~ /^{customer}$/) AND time >= now()-12h GROUP BY "Tenant"`;
// let basUrl="https://grafana.monocle.cts.infor.com/api/dashboards/home"
let grafanaTenantUrl = `${BASEURL}query?db=telegraf&q=${tenantQuery}`;
let grafanaCustomersUrl = `${BASEURL}query?db=telegraf&q=${customersquery}`;
const addOrUpdateTenantStorage = `
    mutation addOrUpdateTenantStorage($input: CustomerStorageTenantInput) {
      addOrUpdateTenantStorage (input: $input) {
        id
        farm
        tenant
        size
        customer
      }
    }
  `;
// console.log(grafanaTenantUrl);
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN}`,
};
const url = "http://nlbavwixs.infor.com:8888";

async function run(farmName, x) {
  let results = null;
  let farm = farmName === "euce1prda" ? "Frankfurt" : farmName === "usea1prda" ? "Us-East-1" : farmName === "apne1prda" ? "Tokyo" : "Sydney";
  try {
    // console.log(farm, '\r\n');

    const newgrafanaCustomersUrl = grafanaCustomersUrl.replace("{farm}", farmName);
    const response = await fetch(newgrafanaCustomersUrl, {
      // credentials: 'include',
      // method: 'POST',
      // mode: 'no-cors',
      headers: headers,
    });
    const json = await response.json();
    // console.log(JSON.stringify(json));
    const { results } = json;
    // console.log(results[0].series);
    const series = results[0].series;
    // console.log(`series`, series);

    const customerdata = series.map((item) => ({
      farm,
      date: new Date().toISOString().substring(0, 10),
      customer: item.tags.Customer,
      // size: Math.floor(item.values[0][1] / 1000000),
    }));

    const tenantdata = await customerdata.map(async ({ customer }) => {
      const newgrafanaTenantUrl = grafanaTenantUrl.replace("{farm}", farmName).replace("{customer}", customer);
      const response = await fetch(newgrafanaTenantUrl, {
        headers: headers,
      });

      const json = await response.json();
      // console.log(`json`, json);
      const { results } = json;
      const series = results[0].series;
      // console.log(`series`, series);
      const data = series.map((item) => ({
        customer,
        date: new Date().toISOString().substring(0, 10),
        farm,
        tenant: item.tags["Tenant"],
        size: Math.floor(item.values[0][1] / 1000000),
      }));
      data.map(async ({ farm, tenant, customer, size, date }) => {
        const input = { farm, tenant, customer, size, date };
        try {
          await request(url, addOrUpdateTenantStorage, { input });
        } catch (error) {
          console.log(`error`, error);
        }
      });
      // fs.writeFileSync("space_tenant_customers.json", JSON.stringify(data, null, 2));
      return data;
    });
  } catch (e) {
    console.log(e);
  }
}

run("euce1prda");
run("usea1prda", true);
run("apse2prda", true);
run("apne1prda", true);
