import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

// function createQueryInput(
//   movieId: string,
//   minRating?: string,
//   reviewerName?: string
// ): QueryCommandInput {
//   const expressionAttributeValues: any = { ":movieId": movieId };
//   let filterExpressions: string[] = [];

//   if (minRating) {
//     expressionAttributeValues[":minRating"] = parseInt(minRating);
//     filterExpressions.push("Rating > :minRating");
//   }
//   if (reviewerName) {
//     expressionAttributeValues[":reviewerName"] = reviewerName;
//     filterExpressions.push("ReviewerName = :reviewerName");
//   }

//   return {
//     TableName: process.env.TABLE_NAME!,
//     KeyConditionExpression: "MovieId = :movieId",
//     ExpressionAttributeValues: expressionAttributeValues,
//     FilterExpression: filterExpressions.join(" and ") || undefined,
//   };
// }

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  //   if (!process.env.TABLE_NAME) {
  //     console.error("Environment variable TABLE_NAME is not set.");
  //     return {
  //       statusCode: 500,
  //       headers: { "content-type": "application/json" },
  //       body: JSON.stringify({ message: "Server configuration error" }),
  //     };
  //   }
  try {
    console.log("Event: ", event);
    const movieId = event.pathParameters?.movieId;
    const minRating = event.queryStringParameters?.minRating;
    const reviewerName = event.pathParameters?.reviewerName;
    if (!movieId) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Movie ID is required in the path" }),
      };
    }

    const queryInput: QueryCommandInput = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "MovieId = :movieId",
      ExpressionAttributeValues: {
        ":movieId": parseInt(movieId),
        ...(minRating ? { ":minRating": parseInt(minRating) } : {}),
        ...(reviewerName ? { ":reviewerName": reviewerName } : {}),
      },
    };

    if (minRating) {
      queryInput.FilterExpression +=
        (queryInput.FilterExpression ? " and " : "") + "Rating > :minRating";
    }
    if (reviewerName) {
      queryInput.FilterExpression +=
        (queryInput.FilterExpression ? " and " : "") +
        "Reviewername = :reviewerName";
    }
    if (!queryInput.FilterExpression) {
      delete queryInput.FilterExpression;
    }
    if (reviewerName) {
      queryInput.FilterExpression +=
        (queryInput.FilterExpression ? " and " : "") +
        "Reviewername = :reviewerName";
    }
    if (!queryInput.FilterExpression) {
      delete queryInput.FilterExpression;
    }

    const queryOutput = await ddbDocClient.send(new QueryCommand(queryInput));

    if (!queryOutput.Items || queryOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: "No reviews found for the specified movie ID",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ reviews: queryOutput.Items }),
    };
  } catch (error: any) {
    console.error("Error: ", error);
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
