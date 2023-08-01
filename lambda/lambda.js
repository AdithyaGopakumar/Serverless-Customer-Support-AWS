const AWS = require("aws-sdk");

AWS.config.update({
  region: "enter your region",
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const table = "enter your table name";

// paths you provide in your API Gateway
const healthPath = "/health";
const supportPath = "/support";

// main handler function
exports.handler = async function (event) {
  console.log("request event :", event);
  let response;
  switch (true) {
    case event.httpMethod === "GET" && event.path === healthPath:
      response = buildResponse(200);
      break;
    case event.httpMethod === "GET" && event.path === supportPath:
      response = await getSupportTickets();
      break;
    case event.httpMethod === "POST" && event.path === supportPath:
      response = await postSupportTicket(JSON.parse(event.body));
      break;
    default:
      break;
  }
  return response;
};

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamoDB.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartKey = dynamoData.LastEvaluateKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch (error) {
    console.error(error);
  }
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application.json",
    },
    body: JSON.stringify(body),
  };
}

async function getSupportTickets() {
  const params = {
    TableName: table,
  };
  const allSupportTickets = await scanDynamoRecords(params, []);
  const body = {
    supportTickets: allSupportTickets,
  };
  return buildResponse(200, body);
}

async function postSupportTicket(reqBody) {
  const params = {
    TableName: table,
    Item: {
      id:(Math.floor(Math.random() * (1000000 - 100 + 1)) + 100).toString(),
      ...reqBody
    },
  };
  return await dynamoDB.put(params).promise()
    .then(() => {
      const body = {
        Operation: "SAVE",
        Message: "SUCCESS",
        Item: reqBody,
      };
      return buildResponse(200, body);
    })
    .catch((error) => {
      console.error(error);
      return buildResponse(500, error);
    });
}

