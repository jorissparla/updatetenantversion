const { request } = require("graphql-request");
const fetch = require("node-fetch");
const fs = require("fs");
require("dotenv").config();
let { BASEURL, TOKEN } = process.env;

// const query = 'SELECT * FROM "Tenant Upgrade" WHERE time >= now() - 6h GROUP BY "faro_deployment"'.replace(/"/gi, "%22").replace(/ /gi, "%20");
const query = `SELECT sum("used_space") FROM "ElnDataVolume_V41" WHERE ("Farm" =~ /^{farm}$/) AND time >= now()-12h GROUP BY "Customer"`;
console.log(query);
// let basUrl="https://grafana.monocle.cts.infor.com/api/dashboards/home"
let grafanaUrl = `${BASEURL}query?db=telegraf&q=${query}`;
const addOrUpdateStorage = `
    mutation addOrUpdateStorage($input: CustomerStorageInput) {
      addOrUpdateStorage (input: $input) {
         id
        farm
        size
        customer
      }
    }
  `;
console.log(grafanaUrl);
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN}`,
};
const url = "http://nlbavwixs.infor.com:4000";

async function run(farmName, x) {
  let results = null;
  let farm = farmName === "euce1prda" ? "Frankfurt" : farmName === "usea1prda" ? "Us-East-1" : farmName === "apne1prda" ? "Tokyo" : "Sydney";
  try {
    // console.log(farm, '\r\n');
    const newgrafanaUrl = grafanaUrl.replace("{farm}", farmName);
    const response = await fetch(newgrafanaUrl, {
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
    const data = series.map((item) => ({
      farm,
      date: new Date().toISOString().substring(0, 10),
      customer: item.tags.Customer,
      size: Math.floor(item.values[0][1] / 1000000),
    }));
    // .sort((t1, t2) => (t2.size > t1.size ? 1 : -1));
    data.map(async ({ farm, customer, size, date }) => {
      const input = { farm, customer, size, date };
      try {
        await request(url, addOrUpdateStorage, { input });
      } catch (error) {
        console.log(`error`, error);
      }
    });
    fs.writeFileSync(`spacedata.${farm}.json`, JSON.stringify(data, null, 2));
    fs.writeFileSync("space.json", JSON.stringify(results[0].series, null, 2));
  } catch (e) {
    console.log(e);
  }
}
//   console.log(results, farm);

run("euce1prda");
run("usea1prda", true);
run("apse2prda", true);
run("apne1prda", true);
