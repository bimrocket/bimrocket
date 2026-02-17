package org.bimrocket.service.bcf;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class BCFApiClient
{
  private final String baseUrl;
  private final String authorizationHeader;
  private final HttpClient client = HttpClient.newHttpClient();

  public BCFApiClient(String baseUrl, String username, String password)
  {
    this.baseUrl = baseUrl;
    String auth = username + ":" + password;
    this.authorizationHeader = "Basic " + Base64.getEncoder().encodeToString(auth.getBytes());
  }

  public ApiResponse getAllProjects() throws IOException
  {
    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(baseUrl))
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

  public ApiResponse getAllProjectsWithFilter(String filter, String orderBy) throws IOException
  {
    String queryParams = "?$filter=" + URLEncoder.encode(filter, StandardCharsets.UTF_8)
            + "&$orderBy=" + URLEncoder.encode(orderBy, StandardCharsets.UTF_8);

    String endpoint = baseUrl + queryParams;

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

  public ApiResponse getProject(String projectId) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId;

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

  public ApiResponse updateProject(String projectId, String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId;

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

  public ApiResponse deleteProject(String projectId) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
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

  public ApiResponse getProjectExtensions(String projectId) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId + "/extensions";

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

  public ApiResponse updateProjectExtensions(String projectId, String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId + "/extensions";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Content-Type", "application/json")
      .header("Authorization", authorizationHeader)
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
