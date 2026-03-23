import mysql from "mysql2/promise";

const conn = await mysql.createConnection(
  "mysql://2p6j3BQsJaJepD8.afb36c539aeb:XfQF93Gvd3QhvMd50Z4u@gateway04.us-east-1.prod.aws.tidbcloud.com:4000/eeuiwzaR9QfanoQAViE7rS?ssl=%7B%22rejectUnauthorized%22%3Atrue%7D"
);

const [rows] = await conn.execute("SHOW TABLES");
console.log("Existing tables:");
rows.forEach((r) => console.log(" -", Object.values(r)[0]));
await conn.end();
