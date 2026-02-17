package org.bimrocket.service.bcf;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;

import com.github.tomakehurst.wiremock.WireMockServer;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.*;

public class BCFServiceTest
{
  private BcfService bcfService;

  private WireMockServer wireMockServer;
  private BCFApiClient client;

  static String baseURL;
  static String username;
  static String password;

  @BeforeAll
  public static void setupOnce()
  {
    baseURL = "http://localhost:9191/bimrocket-server/api/bcf/2.1/projects";
    username = "admin";
    password = "bimrocket";
  }

  @BeforeEach
  public void setUp()
  {
    wireMockServer = new WireMockServer(9191); // Port 9191, like Tomcat
    wireMockServer.start();

    configureFor("localhost", 9191);

    stubFor(get(urlEqualTo("/bimrocket-server/api/bcf/2.1/projects"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("[ { \"project_id\": \"100\", \"name\": \"Project A\" }, { \"project_id\": \"101\", \"name\": \"Project B\" } ]")));

    stubFor(get(urlPathEqualTo("/bimrocket-server/api/bcf/2.1/projects"))
      .withQueryParam("$filter", equalTo("project_id eq '100'"))
      .withQueryParam("$orderBy", equalTo("name asc"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("[ { \"project_id\": \"100\", \"name\": \"Project A\" } ]")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/bcf/2.1/projects/120"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.name", equalTo("string")))
      .withRequestBody(matchingJsonPath("$.project_id", equalTo("string")))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"status\": \"updated\" }")));

    stubFor(get(urlEqualTo("/bimrocket-server/api/bcf/2.1/projects/100"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"project_id\": \"100\", \"name\": \"Test Project\" }")));

    stubFor(get(urlEqualTo("/bimrocket-server/api/bcf/2.1/projects/10"))
      .willReturn(aResponse()
      .withStatus(204)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"project_id\": \"10\", \"name\": \"Test Project\" }")));

    stubFor(delete(urlEqualTo("/bimrocket-server/api/bcf/2.1/projects/100"))
      .willReturn(aResponse()
      .withStatus(204))); // No Content

    stubFor(get(urlEqualTo("/bimrocket-server/api/bcf/2.1/projects/100/extensions"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      {
         "topic_type": [
         "Incidencia-General-UT",
         "Incidencia-Aigues",
         "Incidencia-Residus",
         "Incidencia-Atmosfera",
         "Ponencia-ambiental",
         "Parametres-Finals-Aigues",
         "Parametres-Finals-Atmosfera",
         "Parametres-Finals-Residus"
         ],
         "topic_status": ["Obert", "Resolt", "Reobert"],
         "topic_label": [],
         "snippet_type": [],
         "priority": [],
         "user_id_type": [
         "",
         "user@domain|mailto:user@domain",
         "user@domain|mailto:user@doamin"
         ],
         "stage": [],
         "read_roles": ["ADMIN"],
         "comment_roles": ["ADMIN"],
         "create_roles": ["ADMIN"],
         "update_roles": [],
         "delete_roles": []
         }
      """)));

    stubFor(put(urlEqualTo("/bimrocket-server/api/bcf/2.1/projects/100/extensions"))
      .withHeader("Content-Type", containing("application/json"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"status\": \"extensions updated\" }")));
  }

  @AfterEach
  public void tearDown() {
        wireMockServer.stop();
    }

  @Test
  @Order(1)
  public void testGetAllProjects() throws Exception
  {
    client = new BCFApiClient(
            baseURL,
            username,
            password
    );

    BCFApiClient.ApiResponse response = client.getAllProjects();
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("Project A"));
    assertTrue(response.getBody().contains("project_id"));
  }

  @Test
  @Order(2)
  public void testGetAllProjectsWithFilter() throws Exception
  {
    client = new BCFApiClient(
            baseURL,
            username,
            password
    );

    BCFApiClient.ApiResponse response = client.getAllProjectsWithFilter("project_id eq '100'", "name asc");
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("Project A"));
    assertTrue(response.getBody().contains("project_id"));
  }

  @Test
  @Order(3)
  public void testUpdateProject() throws Exception
  {
    client = new BCFApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = "{ \"name\": \"string\", \"project_id\": \"string\" }";
    BCFApiClient.ApiResponse response = client.updateProject("120", jsonPayload);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("updated"));
  }

  @Test
  @Order(4)
  public void testGetProject() throws Exception
  {
    client = new BCFApiClient(
      baseURL,
      username,
      password
    );

    BCFApiClient.ApiResponse response = client.getProject("100");
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("Test Project"));
  }

  @Test
  @Order(5)
  public void testGetProjectNotFound() throws Exception
  {
    client = new BCFApiClient(
      baseURL,
      username,
      password
    );

    BCFApiClient.ApiResponse response = client.getProject("10");
    assertEquals(204, response.getStatusCode());
    assertFalse(response.getBody().contains("Test Project"));
  }

  @Test
  @Order(6)
  public void testDeleteProject() throws Exception
  {
    client = new BCFApiClient(
      baseURL,
      username,
      password
    );

    BCFApiClient.ApiResponse response = client.deleteProject("100");
    assertEquals(204, response.getStatusCode());
    assertTrue(response.getBody().isEmpty());
  }

  @Test
  @Order(7)
  public void testGetProjectExtensions() throws Exception
  {
    client = new BCFApiClient(
      baseURL,
      username,
      password
    );

    BCFApiClient.ApiResponse response = client.getProjectExtensions("100");
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("topic_type"));
  }

  @Test
  @Order(8)
  public void testUpdateProjectExtensions() throws Exception
  {
    client = new BCFApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
    {
      "comment_roles": ["VECTOR-UT-OGE"],
      "create_roles": ["VECTOR-UT-OGE"],
      "delete_roles": ["VECTOR-UT-OGE"],
      "priority": [],
      "read_roles": ["VECTOR-UT-OGE"],
      "snippet_type": [],
      "stage": [],
      "topic_label": [],
      "topic_status": ["Obert", "Resolt", "Reobert"],
      "topic_type": [
      "Incidencia-General-UT", "Incidencia-Aigues", "Incidencia-Residus",
      "Incidencia-Atmosfera", "Ponencia-ambiental",
      "Parametres-Finals-Aigues", "Parametres-Finals-Atmosfera", "Parametres-Finals-Residus"
      ],
      "update_roles": ["VECTOR-UT-OGE"],
      "user_id_type": ["", "user@domain|mailto:user@domain", "user@domain|mailto:user@domain"]
    }
    """;

    BCFApiClient.ApiResponse response = client.updateProjectExtensions("100", jsonPayload);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("extensions updated"));
  }

}
