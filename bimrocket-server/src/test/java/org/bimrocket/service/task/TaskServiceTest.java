package org.bimrocket.service.task;

import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.*;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.*;

public class TaskServiceTest
{
  private TaskService taskService;

  private WireMockServer wireMockServer;
  private TaskApiClient client;

  static String baseURL;
  static String username;
  static String password;

  @BeforeAll
  public static void setupOnce()
  {
    baseURL = "http://localhost:9191/bimrocket-server/api/task";
    username = "admin";
    password = "bimrocket";
  }

  @BeforeEach
  public void setUp()
  {
    wireMockServer = new WireMockServer(9191); // Port 9191, like Tomcat
    wireMockServer.start();

    configureFor("localhost", 9191);

    stubFor(get(urlPathEqualTo("/bimrocket-server/api/task/executions"))
      .withQueryParam("$filter", equalTo("status eq 'running'"))
      .withQueryParam("$orderBy", equalTo("start_time desc"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
            [
              {
                "id": "03b1d8b6-3b7a-44e7-9c01-149b396048a1",
                "input": {
                  "project_id": "200"
                },
                "status": "completed",
                "hostname": "Latitude-5420",
                "task_name": "check_status_projecte.js",
                "start_time": 1748360574580,
                "invoker": "admin"
              }
            ]
          """)));

    stubFor(get(urlPathMatching("/bimrocket-server/api/task/executions/03b1d8b6-3b7a-44e7-9c01-149b396048a1"))
      .withQueryParam("waitMillis", equalTo("1000"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
              {
                "id": "03b1d8b6-3b7a-44e7-9c01-149b396048a1",
                "input": {
                  "project_id": "200"
                },
                "status": "completed",
                "hostname": "Latitude-5420",
                "task_name": "check_status_projecte.js",
                "start_time": 1748360574580,
                "invoker": "admin"
              }
              """)));

    stubFor(get(urlPathMatching("/bimrocket-server/api/task/executions/nonexistent-id"))
      .withQueryParam("waitMillis", equalTo("1000"))
      .willReturn(aResponse()
      .withStatus(204)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      {
        "error": "Execution not found"
      }
      """)));

    stubFor(put(urlEqualTo("/bimrocket-server/api/task/executions"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.taskName", equalTo("check_status_projecte.js")))
      .withRequestBody(matchingJsonPath("$.waitTime", equalTo("5000")))
      .withRequestBody(matchingJsonPath("$.input.project_id", equalTo("200")))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"status\": \"Completed\" }")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/task/executions"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.taskName", equalTo("status_projecte.js")))
      .withRequestBody(matchingJsonPath("$.waitTime", equalTo("5000")))
      .withRequestBody(matchingJsonPath("$.input.project_id", equalTo("200")))
      .willReturn(aResponse()
      .withStatus(400)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"error\": \"Task not found\" }")));

    stubFor(delete(urlPathMatching("/bimrocket-server/api/task/executions/03b1d8b6-3b7a-44e7-9c01-149b396048a1"))
      .willReturn(aResponse()
      .withStatus(200)));

    stubFor(delete(urlPathMatching("/bimrocket-server/api/task/executions/nonexistent-id"))
      .willReturn(aResponse()
      .withStatus(500)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"error\": \"Cannot invoke org.bimrocket.api.task.TaskExecution.getStatus() because execution is null\" }")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/task/data"))
        .withHeader("Content-Type", containing("application/json"))
        .withRequestBody(matchingJsonPath("$.data.expedient", equalTo("1000")))
        .willReturn(aResponse()
        .withStatus(200)
        .withHeader("Content-Type", "application/json")
        .withBody("""
         {
           "data": {
           "expedient": "1000",
           "empresa": "",
           "currentVersion": "test",
           "autor": "",
           "status": "underVectorReview"
         },
         "id": "1000",
         "lockingTaskId": "string"
         }
         """)));

    stubFor(get(urlEqualTo("/bimrocket-server/api/task/data/1000"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      {
       "id": "1000",
       "data": {
        "expedient": "1000",
        "empresa": "",
        "currentVersion": "test",
        "autor": "",
        "status": "underVectorReview"
       },
       "lockingTaskId": "string"
      }
      """)));

    stubFor(get(urlEqualTo("/bimrocket-server/api/task/data/nonexistent-id"))
      .willReturn(aResponse()
      .withStatus(204)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      {
       "error": "Data not found"
      }
      """)));

    stubFor(delete(urlEqualTo("/bimrocket-server/api/task/data/1000"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{\"message\": \"Deleted\"}")));

    stubFor(delete(urlEqualTo("/bimrocket-server/api/task/data/nonexistent-id"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{\"message\": \"Not deleted\"}")));
  }

  @AfterEach
  public void tearDown() {
        wireMockServer.stop();
    }

  @Test
  @Order(1)
    public void testGetTaskExecutionsWithValidResponse() throws Exception
  {
    client = new TaskApiClient(
      baseURL,
      username,
      password
    );

    TaskApiClient.ApiResponse response = client.getTaskExecutions("status eq 'running'", "start_time desc");
    assertEquals(200, response.getStatusCode());
    String responseBody = response.getBody();
    assertTrue(responseBody.contains("check_status_projecte.js"));
    assertTrue(responseBody.contains("\"status\": \"completed\""));
    assertTrue(responseBody.contains("\"invoker\": \"admin\""));
  }

  @Test
  @Order(2)
  public void testGetTaskExecutionById() throws Exception
  {
    client = new TaskApiClient(baseURL, username, password);
    String executionId = "03b1d8b6-3b7a-44e7-9c01-149b396048a1";
    long waitMillis = 1000;
    TaskApiClient.ApiResponse response = client.getTaskExecutionById(executionId, waitMillis);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("\"task_name\": \"check_status_projecte.js\""));
    assertTrue(response.getBody().contains("\"invoker\": \"admin\""));
  }

  @Test
  @Order(3)
  public void testGetTaskExecutionById_NotFound() throws Exception
  {
    client = new TaskApiClient(baseURL, username, password);
    String executionId = "nonexistent-id";
    long waitMillis = 1000;
    TaskApiClient.ApiResponse response = client.getTaskExecutionById(executionId, waitMillis);
    assertEquals(204, response.getStatusCode());
    assertTrue(response.getBody().isEmpty());
  }

  @Test
  @Order(4)
  public void testPutExecutions() throws Exception
  {
    client = new TaskApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "input": {
          "project_id": "200"
        },
        "taskName": "check_status_projecte.js",
        "waitTime": 5000
      }
    """;

    TaskApiClient.ApiResponse response = client.executeTask(jsonPayload);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("Completed"));
  }

  @Test
  @Order(5)
  public void testPutExecutionsTaskNotFound() throws Exception
  {
    client = new TaskApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "input": {
          "project_id": "200"
        },
        "taskName": "status_projecte.js",
        "waitTime": 5000
      }
    """;

    TaskApiClient.ApiResponse response = client.executeTask(jsonPayload);
    assertEquals(400, response.getStatusCode());
    assertTrue(response.getBody().contains("Task not found"));
  }

  @Test
  @Order(6)
  public void testDeleteTaskExecutionById_Success() throws Exception
  {
    client = new TaskApiClient(baseURL, username, password);
    String executionId = "03b1d8b6-3b7a-44e7-9c01-149b396048a1";
    TaskApiClient.ApiResponse response = client.deleteTaskExecution(executionId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().isEmpty());
  }

  @Test
  @Order(7)
  public void testDeleteTaskExecutionById_NotFound() throws Exception
  {
    client = new TaskApiClient(baseURL, username, password);
    String executionId = "nonexistent-id";
    TaskApiClient.ApiResponse response = client.deleteTaskExecution(executionId);
    assertEquals(500, response.getStatusCode());
    assertTrue(response.getBody().contains("execution is null"));
  }

  @Test
  @Order(8)
  public void testSaveTaskData() throws Exception
  {
    client = new TaskApiClient(baseURL, username, password);

    String jsonPayload = """
    {
      "data": {
        "expedient": "1000",
        "empresa": "",
        "currentVersion": "test",
        "autor": "",
        "status": "underVectorReview"
      },
      "id": "1000",
      "lockingTaskId": "string"
    }
    """;

    TaskApiClient.ApiResponse response = client.putTaskData(jsonPayload);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("\"expedient\": \"1000\""));
    assertTrue(response.getBody().contains("\"status\": \"underVectorReview\""));
  }

  @Test
  @Order(9)
  public void testGetTaskDataById() throws Exception
  {
    client = new TaskApiClient(baseURL, username, password);
    String dataId = "1000";
    TaskApiClient.ApiResponse response = client.getTaskDataById(dataId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("\"id\": \"1000\""));
    assertTrue(response.getBody().contains("\"expedient\": \"1000\""));
    assertTrue(response.getBody().contains("\"status\": \"underVectorReview\""));
  }

  @Test
  @Order(10)
  public void testGetTaskDataById_NotFound() throws Exception
  {
    client = new TaskApiClient(baseURL, username, password);
    String dataId = "nonexistent-id";
    TaskApiClient.ApiResponse response = client.getTaskDataById(dataId);
    assertEquals(204, response.getStatusCode());
    assertTrue(response.getBody().isEmpty());
  }

  @Test
  @Order(11)
  public void testDeleteTaskData_ExistingId() throws Exception
  {
    client = new TaskApiClient(baseURL, username, password);
    String dataId = "1000";
    TaskApiClient.ApiResponse response = client.deleteTaskDataById(dataId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("Deleted"));
  }

  @Test
  @Order(12)
  public void testDeleteTaskData_NonExistingId() throws Exception
  {
    client = new TaskApiClient(baseURL, username, password);
    String dataId = "nonexistent-id";
    TaskApiClient.ApiResponse response = client.deleteTaskDataById(dataId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("Not deleted"));
  }

}
