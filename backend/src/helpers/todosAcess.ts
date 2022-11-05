import * as AWS from 'aws-sdk'
const AWSXRay = require('aws-xray-sdk')
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
// import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
// import { TodoUpdate } from '../models/TodoUpdate';


const XAWS = AWSXRay.captureAWS(AWS)
const docClient: DocumentClient = createDynamoDBClient()
const todosTable = process.env.TODOS_TABLE
const index = process.env.TODOS_CREATED_AT_INDEX

// const logger = createLogger('TodosAccess')

// // TODO: Implement the dataLayer logic
export async function createTodo(todo: TodoItem): Promise<TodoItem> {
    await docClient.put({
        TableName: todosTable,
        Item: todo
    }).promise()

    return todo
}

export async function getAllTodosByUserId(userId: string): Promise<TodoItem[]> {
    const result = await docClient.query({
        TableName: todosTable,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        }
    }).promise()

    return result.Items as TodoItem[]
}

export async function getTodoById(todoId: string): Promise<TodoItem> {
    const result = await docClient.query({
        TableName: todosTable,
        IndexName: index,
        KeyConditionExpression: 'todoId = :todoId',
        ExpressionAttributeValues: {
            ':todoId': todoId
        }
    }).promise()
    if (result.Items.length !== 0) return result.Items[0] as TodoItem
}

export async function updateTodo(todo: TodoItem): Promise<TodoItem> {
    const result = await docClient.update({
        TableName: todosTable,
        Key: {
            userId: todo.userId,
            todoId: todo.todoId
        },
        UpdateExpression: 'set attachmentUrl = :attachmentUrl',        
        ExpressionAttributeValues: {
            ':attachmentUrl': todo.attachmentUrl
        }
    }).promise()

    return result.Attributes as TodoItem
}

export async function updateTodoById(todoId: string, userId: string, updatedTodo: UpdateTodoRequest): Promise<void> {
    await docClient.update({
      TableName: todosTable,
      Key: {
        todoId,
        userId
      },
      UpdateExpression: "set #name = :n, dueDate = :d, done = :done",
      ExpressionAttributeValues: {
        ":n": updatedTodo.name,
        ":d": updatedTodo.dueDate,
        ":done": updatedTodo.done
      },
      ExpressionAttributeNames: {
        "#name": "name"
      }
    }).promise()
}

export async function deleteTodoById(todoId: string, userId: string): Promise<void> {
    await docClient.delete({
      TableName: todosTable,
      Key: {
        todoId,
        userId
      }
    }).promise()
}

function createDynamoDBClient() {
    if (process.env.IS_OFFLINE) {
      console.log('Creating a local DynamoDB instance')
      return new XAWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://localhost:8000'
      })
    }
  
    return new XAWS.DynamoDB.DocumentClient()
  }
  