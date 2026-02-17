package org.bimrocket.service.security;

import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.*;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SecurityServiceTest
{
  private SecurityService securityService;

  private WireMockServer wireMockServer;
  private SecurityApiClient client;

  static String baseURL;
  static String username;
  static String password;

  @BeforeAll
  public static void setupOnce()
  {
    baseURL = "http://localhost:9191/bimrocket-server/api/security";
    username = "admin";
    password = "bimrocket";
  }

  @BeforeEach
  public void setUp()
  {
    wireMockServer = new WireMockServer(9191); // Port 9191, like Tomcat
    wireMockServer.start();

    configureFor("localhost", 9191);

    stubFor(get(urlEqualTo("/bimrocket-server/api/security/roles"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      [
        {
          "id": "100",
          "description": "Roles for admin",
          "roles": ["ADMIN"]
        }, 
        {
          "id": "200",
          "description": "Roles for user projectista",
          "roles": ["PROJECTISTA"]
        }
      ]
      """)));

    stubFor(get(urlPathEqualTo("/bimrocket-server/api/security/roles"))
      .withQueryParam("$filter", equalTo("id eq '100'"))
      .withQueryParam("$orderBy", equalTo("description asc"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      [
        {
          "id": "100",
          "description": "Roles for admin",
          "roles": ["ADMIN"]
        }
      ]
      """)));

    stubFor(get(urlPathMatching("/bimrocket-server/api/security/roles/100"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      {
        "id": "100",
        "description": "Roles for admin",
        "roles": ["ADMIN"]
      }
      """)));

    stubFor(get(urlPathMatching("/bimrocket-server/api/security/roles/nonexistent-id"))
      .willReturn(aResponse()
      .withStatus(204)
      .withHeader("Content-Type", "application/json")
      .withBody("""
       {
         "error": "Role not found"
       }
       """)));

    stubFor(post(urlEqualTo("/bimrocket-server/api/security/roles"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.description", equalTo("Roles for admin")))
      .withRequestBody(matchingJsonPath("$.id", equalTo("100")))
      .withRequestBody(matchingJsonPath("$.roles", equalToJson("[\"ADMIN\"]")))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"id\": \"100\" }")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/security/roles"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.description", equalTo("Roles for administrator")))
      .withRequestBody(matchingJsonPath("$.id", equalTo("100")))
      .withRequestBody(matchingJsonPath("$.roles", equalToJson("[\"ADMIN\"]")))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"id\": \"100\" }")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/security/roles"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.description", equalTo("Roles for administrator")))
      .withRequestBody(matchingJsonPath("$.id", equalTo("200")))
      .withRequestBody(matchingJsonPath("$.roles", equalToJson("[\"ADMIN\"]")))
      .willReturn(aResponse()
      .withStatus(400)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"error\": \"Role not found\" }")));

    stubFor(delete(urlPathMatching("/bimrocket-server/api/security/roles/100"))
      .willReturn(aResponse()
      .withStatus(200)));

    stubFor(delete(urlPathMatching("/bimrocket-server/api/security/roles/nonexistent-id"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"code\": \"200\", \"message\": \"OK\" }")));

    stubFor(get(urlEqualTo("/bimrocket-server/api/security/users"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      [
        {
         "id": "seguser",
         "name": "seg",
         "password_hash": "224Wk7VJrX2AYosCddHby75lGvVe2FuzLNSN2ZeGqhM=",
         "email": "seg.user@i2cat.net",
         "roles": [
           "ADMIN"
         ],
         "active": true,
         "creation_date": "2025-11-10T11:42:34",
         "modify_date": "2025-11-10T11:42:34"
       }
      ]
      """)));

    stubFor(get(urlPathEqualTo("/bimrocket-server/api/security/users"))
      .withQueryParam("$filter", equalTo("name eq 'seg'"))
      .withQueryParam("$orderBy", equalTo("name asc"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      [
        {
         "id": "seguser",
         "name": "seg",
         "password_hash": "224Wk7VJrX2AYosCddHby75lGvVe2FuzLNSN2ZeGqhM=",
         "email": "seg.user@i2cat.net",
         "roles": [
           "ADMIN"
         ],
         "active": true,
         "creation_date": "2025-11-10T11:42:34",
         "modify_date": "2025-11-10T11:42:34"
       }
      ]
      """)));

    stubFor(get(urlPathMatching("/bimrocket-server/api/security/users/seguser"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("""
        {
         "id": "seguser",
         "name": "seg",
         "password_hash": "224Wk7VJrX2AYosCddHby75lGvVe2FuzLNSN2ZeGqhM=",
         "email": "seg.user@i2cat.net",
         "roles": [
           "ADMIN"
         ],
         "active": true,
         "creation_date": "2025-11-10T11:42:34",
         "modify_date": "2025-11-10T11:42:34"
       }
      """)));

    stubFor(get(urlPathMatching("/bimrocket-server/api/security/users/nonexistent-id"))
      .willReturn(aResponse()
      .withStatus(204)
      .withHeader("Content-Type", "application/json")
      .withBody("""
      {
        "error": "User not found"
      }
      """)));

    stubFor(post(urlEqualTo("/bimrocket-server/api/security/users"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.active", equalTo("true")))
      .withRequestBody(matchingJsonPath("$.creation_date", equalTo("2025-11-10T11:42:34")))
      .withRequestBody(matchingJsonPath("$.email", equalTo("seg.user@i2cat.net")))
      .withRequestBody(matchingJsonPath("$.id", equalTo("seguser")))
      .withRequestBody(matchingJsonPath("$.modify_date", equalTo("2025-11-10T11:42:34")))
      .withRequestBody(matchingJsonPath("$.name", equalTo("seg")))
      .withRequestBody(matchingJsonPath("$.password", equalTo("i2cat12345#")))
      .withRequestBody(matchingJsonPath("$.password_hash", equalTo("")))
      .withRequestBody(matchingJsonPath("$.roles", equalToJson("[\"ADMIN\"]")))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"id\": \"seguser\" }")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/security/users"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.active", equalTo("true")))
      .withRequestBody(matchingJsonPath("$.creation_date", equalTo("2025-11-10T11:42:34")))
      .withRequestBody(matchingJsonPath("$.email", equalTo("seg.user@i2cat.net")))
      .withRequestBody(matchingJsonPath("$.id", equalTo("seguser")))
      .withRequestBody(matchingJsonPath("$.modify_date", equalTo("2025-11-10T11:42:34")))
      .withRequestBody(matchingJsonPath("$.name", equalTo("seg")))
      .withRequestBody(matchingJsonPath("$.password", equalTo("i2cat12345#")))
      .withRequestBody(matchingJsonPath("$.password_hash", equalTo("")))
      .withRequestBody(matchingJsonPath("$.roles", equalToJson("[\"ADMIN\"]")))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"id\": \"seguser\" }")));

    stubFor(put(urlEqualTo("/bimrocket-server/api/security/users"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.active", equalTo("true")))
      .withRequestBody(matchingJsonPath("$.creation_date", equalTo("2025-11-10T11:42:34")))
      .withRequestBody(matchingJsonPath("$.email", equalTo("seg.user@i2cat.net")))
      .withRequestBody(matchingJsonPath("$.id", equalTo("segseg")))
      .withRequestBody(matchingJsonPath("$.modify_date", equalTo("2025-11-10T11:42:34")))
      .withRequestBody(matchingJsonPath("$.name", equalTo("seg")))
      .withRequestBody(matchingJsonPath("$.password", equalTo("i2cat12345#")))
      .withRequestBody(matchingJsonPath("$.password_hash", equalTo("")))
      .withRequestBody(matchingJsonPath("$.roles", equalToJson("[\"ADMIN\"]")))
      .willReturn(aResponse()
      .withStatus(400)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"error\": \"User not found\" }")));

    stubFor(delete(urlPathMatching("/bimrocket-server/api/security/users/seguser"))
      .willReturn(aResponse()
      .withStatus(200)));

    stubFor(delete(urlPathMatching("/bimrocket-server/api/security/users/nonexistent-id"))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"code\": \"200\", \"message\": \"OK\" }")));

    stubFor(post(urlEqualTo("/bimrocket-server/api/security/users/seguser/password"))
      .withHeader("Content-Type", containing("application/json"))
      .withRequestBody(matchingJsonPath("$.new_password", equalTo("i2cat12346#")))
      .withRequestBody(matchingJsonPath("$.old_password", equalTo("i2cat12345#")))
      .willReturn(aResponse()
      .withStatus(200)
      .withHeader("Content-Type", "application/json")
      .withBody("{ \"new_password\": \"i2cat12346#\" }")));
  }

  @AfterEach
  public void tearDown() {
        wireMockServer.stop();
    }

  @Test
  @Order(1)
  public void testGetAllRoles() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    SecurityApiClient.ApiResponse response = client.getAllRoles();
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("Roles for admin"));
    assertTrue(response.getBody().contains("Roles for user"));
  }

  @Test
  @Order(2)
    public void testGetRolesWithValidResponse() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    SecurityApiClient.ApiResponse response = client.getRoles("id eq '100'", "description asc");
    assertEquals(200, response.getStatusCode());
    String responseBody = response.getBody();
    assertTrue(responseBody.contains("\"id\": \"100\""));
    assertTrue(responseBody.contains("\"description\": \"Roles for admin\""));
  }

  @Test
  @Order(3)
  public void testGetRoleById() throws Exception
  {
    client = new SecurityApiClient(baseURL, username, password);
    String roleId = "100";
    SecurityApiClient.ApiResponse response = client.getRoleById(roleId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("\"id\": \"100\""));
    assertTrue(response.getBody().contains("\"description\": \"Roles for admin\""));
  }

  @Test
  @Order(4)
  public void testGetRoleById_NotFound() throws Exception
  {
    client = new SecurityApiClient(baseURL, username, password);
    String executionId = "nonexistent-id";
    SecurityApiClient.ApiResponse response = client.getRoleById(executionId);
    assertEquals(204, response.getStatusCode());
    assertTrue(response.getBody().isEmpty());
  }

  @Test
  @Order(5)
  public void testPostRoles() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "description": "Roles for admin",
        "id": "100",
        "roles": ["ADMIN"]
      }
    """;

    SecurityApiClient.ApiResponse response = client.postRole(jsonPayload);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("100"));
  }

  @Test
  @Order(5)
  public void testPutRoles() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "description": "Roles for administrator",
        "id": "100",
        "roles": ["ADMIN"]
      }
    """;

    SecurityApiClient.ApiResponse response = client.putRole(jsonPayload);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("100"));
  }

  @Test
  @Order(6)
  public void testPutRolesRoleNotFound() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "description": "Roles for administrator",
        "id": "200",
        "roles": ["ADMIN"]
      }
    """;

    SecurityApiClient.ApiResponse response = client.putRole(jsonPayload);
    assertEquals(400, response.getStatusCode());
    assertTrue(response.getBody().contains("Role not found"));
  }

  @Test
  @Order(7)
  public void testDeleteRoleById_Success() throws Exception
  {
    client = new SecurityApiClient(baseURL, username, password);
    String roleId = "100";
    SecurityApiClient.ApiResponse response = client.deleteRole(roleId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().isEmpty());
  }

  @Test
  @Order(8)
  public void testDeleteRoleById_NotFound() throws Exception
  {
    client = new SecurityApiClient(baseURL, username, password);
    String roleId = "nonexistent-id";
    SecurityApiClient.ApiResponse response = client.deleteRole(roleId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("OK"));
  }

  @Test
  @Order(9)
  public void testGetAllUsers() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    SecurityApiClient.ApiResponse response = client.getAllUsers();
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("seguser"));
    assertTrue(response.getBody().contains("2025"));
  }

  @Test
  @Order(10)
  public void testGetUsersWithValidResponse() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    SecurityApiClient.ApiResponse response = client.getUsers("name eq 'seg'", "name asc");
    assertEquals(200, response.getStatusCode());
    String responseBody = response.getBody();
    assertTrue(responseBody.contains("\"name\": \"seg\""));
    assertTrue(responseBody.contains("\"id\": \"seguser\""));
  }

  @Test
  @Order(11)
  public void testGetUserById() throws Exception
  {
    client = new SecurityApiClient(baseURL, username, password);
    String userId = "seguser";
    SecurityApiClient.ApiResponse response = client.getUserById(userId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("\"id\": \"seguser\""));
    assertTrue(response.getBody().contains("\"name\": \"seg\""));
  }

  @Test
  @Order(12)
  public void testGetUserById_NotFound() throws Exception
  {
    client = new SecurityApiClient(baseURL, username, password);
    String executionId = "nonexistent-id";
    SecurityApiClient.ApiResponse response = client.getUserById(executionId);
    assertEquals(204, response.getStatusCode());
    assertTrue(response.getBody().isEmpty());
  }

  @Test
  @Order(13)
  public void testPostUsers() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
         "id": "seguser",
         "name": "seg",
         "password_hash": "",
         "password": "i2cat12345#",
         "email": "seg.user@i2cat.net",
         "roles": [
           "ADMIN"
         ],
         "active": true,
         "creation_date": "2025-11-10T11:42:34",
         "modify_date": "2025-11-10T11:42:34"
       }
    """;

    SecurityApiClient.ApiResponse response = client.postUser(jsonPayload);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("seguser"));
  }

  @Test
  @Order(14)
  public void testPutUsers() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "id": "seguser",
        "name": "seg",
        "password_hash": "",
        "password": "i2cat12345#",
        "email": "seg.user@i2cat.net",
        "roles": [
          "ADMIN"
        ],
        "active": true,
        "creation_date": "2025-11-10T11:42:34",
        "modify_date": "2025-11-10T11:42:34"
      }
    """;

    SecurityApiClient.ApiResponse response = client.putUser(jsonPayload);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("seguser"));
  }

  @Test
  @Order(15)
  public void testPutUsersNotFound() throws Exception
  {
    client = new SecurityApiClient(
      baseURL,
      username,
      password
    );

    String jsonPayload = """
      {
        "id": "segseg",
        "name": "seg",
        "password_hash": "",
        "password": "i2cat12345#",
        "email": "seg.user@i2cat.net",
        "roles": [
          "ADMIN"
        ],
        "active": true,
        "creation_date": "2025-11-10T11:42:34",
        "modify_date": "2025-11-10T11:42:34"
      }
    """;

    SecurityApiClient.ApiResponse response = client.putUser(jsonPayload);
    assertEquals(400, response.getStatusCode());
    assertTrue(response.getBody().contains("User not found"));
  }

  @Test
  @Order(16)
  public void testDeleteUserById_Success() throws Exception
  {
    client = new SecurityApiClient(baseURL, username, password);
    String userId = "seguser";
    SecurityApiClient.ApiResponse response = client.deleteUser(userId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().isEmpty());
  }

  @Test
  @Order(17)
  public void testDeleteUserById_NotFound() throws Exception
  {
    client = new SecurityApiClient(baseURL, username, password);
    String userId = "nonexistent-id";
    SecurityApiClient.ApiResponse response = client.deleteUser(userId);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("OK"));
  }

  @Test
  @Order(18)
  public void testChangePassword() throws Exception
  {
    client = new SecurityApiClient(baseURL, username, password);

    String userId = "seguser";

    String jsonPayload = """
      {
        "new_password": "i2cat12346#",
        "old_password": "i2cat12345#",
      }
    """;

    SecurityApiClient.ApiResponse response = client.changePassword(userId, jsonPayload);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("new_password"));
  }

}
