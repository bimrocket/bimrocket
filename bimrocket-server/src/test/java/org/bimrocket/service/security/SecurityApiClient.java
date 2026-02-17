package org.bimrocket.service.security;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SecurityApiClient
{
  private final String baseUrl;
  private final String authorizationHeader;
  private final HttpClient client = HttpClient.newHttpClient();

  public SecurityApiClient(String baseUrl, String username, String password)
  {
    this.baseUrl = baseUrl;
    String auth = username + ":" + password;
    this.authorizationHeader = "Basic " + Base64.getEncoder().encodeToString(auth.getBytes());
  }

  public ApiResponse getAllRoles() throws IOException
  {
    String endpoint = baseUrl + "/roles";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .GET()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = responseCode == 200 && response.body() != null
        ? response.body()
        : "";
      return new ApiResponse(responseCode, body);

    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse getRoles(String filter, String orderBy) throws IOException
  {
    String queryParams = "?$filter=" + URLEncoder.encode(filter, StandardCharsets.UTF_8)
      + "&$orderBy=" + URLEncoder.encode(orderBy, StandardCharsets.UTF_8);
    String endpoint = baseUrl + "/roles" + queryParams;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .GET()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = responseCode < 400 && response.body() != null
        ? response.body()
        : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }


  public ApiResponse getRoleById(String roleId) throws IOException
  {
    String endpoint = baseUrl + "/roles/" + roleId;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .GET()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = responseCode < 204 && response.body() != null
        ? response.body()
        : "";
      return new ApiResponse(responseCode, body);

    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse deleteRole(String roleId) throws IOException
  {
    String endpoint = baseUrl + "/roles/" + roleId;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Authorization", authorizationHeader)
      .header("Accept", "application/json")
      .DELETE()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = responseCode < 500 && response.body() != null
        ? response.body()
        : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse postRole(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/roles";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = responseCode < 400 && response.body() != null
        ? response.body()
        : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse putRole(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/roles";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .header("Content-Type", "application/json")
      .PUT(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = response.body() != null ? response.body() : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse getAllUsers() throws IOException
  {
    String endpoint = baseUrl + "/users";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .GET()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = response.body() != null ? response.body() : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse getUsers(String filter, String orderBy) throws IOException
  {
    String queryParams = "?$filter=" + URLEncoder.encode(filter, StandardCharsets.UTF_8)
            + "&$orderBy=" + URLEncoder.encode(orderBy, StandardCharsets.UTF_8);

    String endpoint = baseUrl + "/users" + queryParams;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .GET()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = response.body() != null ? response.body() : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse getUserById(String userId) throws IOException
  {
    String endpoint = baseUrl + "/users/" + userId;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .GET()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = response.body() != null ? response.body() : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse deleteUser(String userId) throws IOException
  {

    String endpoint = baseUrl + "/users/" + userId;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Authorization", authorizationHeader)
      .header("Accept", "application/json")
      .DELETE()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = response.body() != null ? response.body() : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse postUser(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/users";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = response.body() != null ? response.body() : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse putUser(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/users";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .header("Content-Type", "application/json")
      .PUT(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = response.body() != null ? response.body() : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse changePassword(String userId, String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/users/" + userId + "/password";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      int responseCode = response.statusCode();
      String body = response.body() != null ? response.body() : "";
      return new ApiResponse(responseCode, body);
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  // Auxiliary class to give formatted response
  public static class ApiResponse
  {
    private final int statusCode;
    private final String body;

    public ApiResponse(int statusCode, String body)
    {
      this.statusCode = statusCode;
      this.body = body;
    }

    public int getStatusCode() {
            return statusCode;
        }

    public String getBody() {
            return body;
        }
  }

}
