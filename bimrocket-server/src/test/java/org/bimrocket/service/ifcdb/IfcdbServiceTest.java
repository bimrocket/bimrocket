package org.bimrocket.service.ifcdb;

import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.*;
import java.io.File;
import java.nio.file.Files;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.stubFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class IfcdbServiceTest
{
  private IfcdbService ifcdbService;

  private WireMockServer wireMockServer;
  private IfcdbApiClient client;

  static String baseURL;
  static String username;
  static String password;

  @BeforeAll
  public static void setupOnce()
  {
    baseURL = "http://localhost:9191/bimrocket-server/api/ifcdb/1.0";
    username = "admin";
    password = "bimrocket";
  }

  @BeforeEach
  public void setUp()
  {
    wireMockServer = new WireMockServer(9191); // Port 9191, like Tomcat
    wireMockServer.start();

    configureFor("localhost", 9191);

    stubFor(get(urlEqualTo("/bimrocket-server/api/ifcdb/1.0/models/IFC4"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
        [
         {
           "id": "BiogasLleida",
           "name": "BiogasLleida",
           "description": null,
           "last_version": 2,
           "read_roles": [
             "admin"
           ],
           "upload_roles": [
             "admin"
           ]
         },
         {
           "id": "3Qk0PjRdj5pedsfgaFL$XZ",
           "name": "BiogasLleidav2",
           "description": null,
           "last_version": 2,
           "read_roles": [
             "admin"
           ],
           "upload_roles": [
             "admin"
           ]
         }
        ]
        """)));

    stubFor(get(urlEqualTo("/bimrocket-server/api/ifcdb/1.0/models/IFC2X3"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
        [
         {
           "id": "3Qk0PjRdj5pedsfgaFL$XZ",
           "name": "BiogasLleidav2",
           "description": null,
           "last_version": 2,
           "read_roles": [
             "admin"
           ],
           "upload_roles": [
             "admin"
           ]
         }
        ]
        """)));

    stubFor(post(urlEqualTo("/bimrocket-server/api/ifcdb/1.0/models/IFC4"))
      .withHeader("Content-Type", containing("application/x-step"))
      .willReturn(aResponse()
      .withStatus(200)
      .withBody("""
          {
            "id": 123,
            "schema": "IFC4"
          }
      """)));

    stubFor(post(urlEqualTo("/bimrocket-server/api/ifcdb/1.0/models/IFC2X3"))
      .withHeader("Content-Type", containing("application/x-step"))
      .willReturn(aResponse()
      .withStatus(400)
      .withHeader("Content-Type", "application/json")
      .withBody("{\"error\":\"Invalid schema\"}")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/ifcdb/1.0/models/IFC4"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.description", equalTo("Model BiogasLleida")))
      .withRequestBody(matchingJsonPath("$.id", equalTo("BiogasLleida")))
      .withRequestBody(matchingJsonPath("$.last_version", equalTo("2")))
      .withRequestBody(matchingJsonPath("$.name", equalTo("Nou BiogasLleida")))
      .withRequestBody(matchingJsonPath("$.read_roles", equalToJson("[\"PROJECTISTA\"]")))
      .withRequestBody(matchingJsonPath("$.upload_roles", equalToJson("[\"PROJECTISTA\"]")))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"id\": \"BiogasLleida\" }")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/ifcdb/1.0/models/IFC4"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.description", equalTo("Model BiogasLleida")))
      .withRequestBody(matchingJsonPath("$.id", equalTo("BiogasLleidaFake")))
      .withRequestBody(matchingJsonPath("$.last_version", equalTo("2")))
      .withRequestBody(matchingJsonPath("$.name", equalTo("Nou BiogasLleida")))
      .withRequestBody(matchingJsonPath("$.read_roles", equalToJson("[\"PROJECTISTA\"]")))
      .withRequestBody(matchingJsonPath("$.upload_roles", equalToJson("[\"PROJECTISTA\"]")))
      .willReturn(aResponse()
      .withStatus(400)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"error\": \"Model not found\" }")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/ifcdb/1.0/models/IFC2X3"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.description", equalTo("Model BiogasLleida")))
      .withRequestBody(matchingJsonPath("$.id", equalTo("BiogasLleidaFake")))
      .withRequestBody(matchingJsonPath("$.last_version", equalTo("2")))
      .withRequestBody(matchingJsonPath("$.name", equalTo("Nou BiogasLleida")))
      .withRequestBody(matchingJsonPath("$.read_roles", equalToJson("[\"PROJECTISTA\"]")))
      .withRequestBody(matchingJsonPath("$.upload_roles", equalToJson("[\"PROJECTISTA\"]")))
      .willReturn(aResponse()
      .withStatus(400)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"error\": \"Invalid schema\" }")));

    stubFor(delete(urlPathMatching("/bimrocket-server/api/ifcdb/1.0/models/IFC4/BiogasLleida/2"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"code\": \"200\", \"message\": \"OK\" }")));

    stubFor(delete(urlPathMatching("/bimrocket-server/api/ifcdb/1.0/models/IFC4/nonexistent-id/2"))
      .willReturn(aResponse()
      .withStatus(500)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"code\": \"500\", \"message\": \"IFC001: Model not found.\" }")));

    stubFor(delete(urlPathMatching("/bimrocket-server/api/ifcdb/1.0/models/IFC6/BiogasLleida/2"))
      .willReturn(aResponse()
      .withStatus(500)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"code\": \"500\", \"message\": \"IFC001: Unsupported schema.\" }")));

    stubFor(get(urlEqualTo("/bimrocket-server/api/ifcdb/1.0/models/IFC4/BiogasLleida/versions"))
      .willReturn(aResponse()
              .withStatus(200)
              .withHeader("Content-Type", "application/json")
              .withBody("""
      [
        {
          "version": 1,
          "creation_date": "2025-11-11T11:28:37",
          "creation_author": "admin",
          "element_count": 295675
        },
        {
          "version": 2,
          "creation_date": "2025-11-11T16:44:55",
          "creation_author": "project",
          "element_count": 295676
        }
      ]
      """)));
  }

  @AfterEach
  public void tearDown() {
        wireMockServer.stop();
    }

  @Test
  @Order(1)
  public void testGetAllModelsIFC4() throws Exception
  {
    client = new IfcdbApiClient(
      baseURL,
      username,
      password
    );

    String schema = "IFC4";
    IfcdbApiClient.ApiResponse response = client.getAllModels(schema);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("BiogasLleida"));
  }

  @Test
  @Order(2)
  public void testGetAllModelsIFC2X3() throws Exception
  {
    client = new IfcdbApiClient(
      baseURL,
      username,
      password
    );

    String schema = "IFC2X3";
    IfcdbApiClient.ApiResponse response = client.getAllModels(schema);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("BiogasLleidav2"));
  }

  @Test
  @Order(3)
  public void testUploadModelSuccess() throws Exception
  {
    client = new IfcdbApiClient(
      baseURL,
      username,
      password);

    // Create fake IFC file
    File tempIfc = File.createTempFile("test", ".ifc");
    Files.writeString(tempIfc.toPath(), "ISO-10303-21; FILE_SCHEMA(('IFC4')); END-ISO-10303-21;");
    IfcdbApiClient.ApiResponse response = client.uploadModel("IFC4", tempIfc);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("\"id\": 123"));
    assertTrue(response.getBody().contains("\"schema\": \"IFC4\""));
  }

  @Test
  @Order(4)
  public void testUploadModelInvalidSchema() throws Exception
  {
    client = new IfcdbApiClient(
      baseURL,
      username,
      password);

    File tempIfc = File.createTempFile("test", ".ifc");
    Files.writeString(tempIfc.toPath(), "ISO-10303-21; FILE_SCHEMA(('IFC4')); END-ISO-10303-21;");
    IfcdbApiClient.ApiResponse response = client.uploadModel("IFC2X3", tempIfc);
    assertEquals(400, response.getStatusCode());
    assertTrue(response.getBody().contains("Invalid schema"));
  }

  @Test
  @Order(5)
  public void testPutModel() throws Exception
  {
    client = new IfcdbApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "description": "Model BiogasLleida",
        "id": "BiogasLleida",
        "last_version": "2",
        "name": "Nou BiogasLleida",
        "read_roles": ["PROJECTISTA"],
        "upload_roles": ["PROJECTISTA"]
      }
    """;

    String schema = "IFC4";
    IfcdbApiClient.ApiResponse response = client.putModel(jsonPayload, schema);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("BiogasLleida"));
  }

  @Test
  @Order(6)
  public void testPutModelsModelNotFound() throws Exception
  {
    client = new IfcdbApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "description": "Model BiogasLleida",
        "id": "BiogasLleidaFake",
        "last_version": "2",
        "name": "Nou BiogasLleida",
        "read_roles": ["PROJECTISTA"],
        "upload_roles": ["PROJECTISTA"]
      }
    """;

    String schema = "IFC4";
    IfcdbApiClient.ApiResponse response = client.putModel(jsonPayload, schema);
    assertEquals(400, response.getStatusCode());
    assertTrue(response.getBody().contains("Model not found"));
  }

  @Test
  @Order(6)
  public void testPutModelsModelInvalidSchema() throws Exception
  {
    client = new IfcdbApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "description": "Model BiogasLleida",
        "id": "BiogasLleidaFake",
        "last_version": "2",
        "name": "Nou BiogasLleida",
        "read_roles": ["PROJECTISTA"],
        "upload_roles": ["PROJECTISTA"]
      }
    """;

    String schema = "IFC2X3";
    IfcdbApiClient.ApiResponse response = client.putModel(jsonPayload, schema);
    assertEquals(400, response.getStatusCode());
    assertTrue(response.getBody().contains("Invalid schema"));
  }

  @Test
  @Order(7)
  public void testDeleteModelById_Success() throws Exception
  {
    client = new IfcdbApiClient(baseURL, username, password);
    String schema = "IFC4";
    String modelId = "BiogasLleida";
    String version = "2";
    IfcdbApiClient.ApiResponse response = client.deleteModel(schema, modelId, version);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("OK"));
  }

  @Test
  @Order(8)
  public void testDeleteModelById_NotFound() throws Exception
  {
    client = new IfcdbApiClient(baseURL, username, password);
    String schema = "IFC4";
    String modelId = "nonexistent-id";
    String version = "2";
    IfcdbApiClient.ApiResponse response = client.deleteModel(schema, modelId, version);
    assertEquals(500, response.getStatusCode());
    assertTrue(response.getBody().contains("IFC001: Model not found."));
  }

  @Test
  @Order(9)
  public void testDeleteModelByIdFakeSchema() throws Exception
  {
    client = new IfcdbApiClient(baseURL, username, password);
    String schema = "IFC6";
    String modelId = "BiogasLleida";
    String version = "2";
    IfcdbApiClient.ApiResponse response = client.deleteModel(schema, modelId, version);
    assertEquals(500, response.getStatusCode());
    assertTrue(response.getBody().contains("IFC001: Unsupported schema."));
  }

  @Test
  @Order(10)
  public void testGetAllModelsVersions() throws Exception
  {
    client = new IfcdbApiClient(
      baseURL,
      username,
      password
    );

    String schema = "IFC4";
    String modelId = "BiogasLleida";
    IfcdbApiClient.ApiResponse response = client.getModelsVersions(schema, modelId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("project"));
  }
}
