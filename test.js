const { request } = require("graphql-request");
const fetch = require("node-fetch");
const fs = require("fs");
const query = 'SELECT * FROM "Tenant Upgrade" WHERE time >= now() - 6h GROUP BY "faro_deployment"'.replace(/"/gi, "%22").replace(/ /gi, "%20");
console.log(query);
let grafanaUrl = `https://grafana.monocle.infor.com/api/datasources/proxy/293/query?db=telegraf&q=${query}`;
// 'https://grafana.monocle.infor.com/api/datasources/proxy/293/query?db=telegraf&q=SELECT%20%22tenantId%22%20AS%20%22Tenant%22%2C%20%22name%22%20AS%20%22Tenant%20Name%22%2C%20%22packComb%22%20AS%20%22Pck.%20Comb.%22%2C%20%22tenantStatus%22%20AS%20%22Tenant%20Status%22%2C%20%22operationalState%22%20AS%20%22Operational%20Status%22%2C%20%22processStatus%22%20AS%20%22Process%20Status%22%2C%20%22farmName%22%20AS%20%22Farm%20Name%22%20FROM%20%22eln-tenants-data%22%20WHERE%20(%22farmName%22%20%3D~%20%2F%5Eapse2prda%24%2F)%20AND%20time%20%3E%3D%20now()%20-%2012h&epoch=ms';

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: "Bearer eyJrIjoiM3dra1hyTzRzak4xYkNEdEg3OGl4eHFrb3FUUTNtM0QiLCJuIjoiRUxOVmlldyIsImlkIjoyNH0=",
};

async function run(farm) {
  let results = null;
  try {
    // console.log(farm, '\r\n');
    const newgrafanaUrl = grafanaUrl.replace("{farm}", farm);
    const response = await fetch(newgrafanaUrl, {
      // credentials: 'include',
      // method: 'POST',
      // mode: 'no-cors',
      headers: headers,
    });
    // const response = await result.json();
    const { results } = await response.json();
    console.log(results[0].series[0].columns);
    fs.writeFileSync("x.json", JSON.stringify(results[0].series[0].values, null, 2));
  } catch (e) {
    console.log(e);
  }
}
//   console.log(results, farm);

run("euce1prda");
