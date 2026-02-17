package org.bimrocket.service.task;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class TaskApiClient
{
  private final String baseUrl;
  private final String authorizationHeader;
  private final HttpClient client = HttpClient.newHttpClient();

  public TaskApiClient(String baseUrl, String username, String password)
  {
    this.baseUrl = baseUrl;
    String auth = username + ":" + password;
    this.authorizationHeader = "Basic " + Base64.getEncoder().encodeToString(auth.getBytes());
  }

  public ApiResponse getTaskExecutions(String filter, String orderBy) throws IOException, InterruptedException
  {
    String queryParams = "?$filter=" + URLEncoder.encode(filter, StandardCharsets.UTF_8)
      + "&$orderBy=" + URLEncoder.encode(orderBy, StandardCharsets.UTF_8);
    String endpoint = baseUrl + "/executions" + queryParams;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .GET()
      .build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    return new ApiResponse(response.statusCode(), response.body());
  }

  public ApiResponse getTaskExecutionById(String executionId, long waitMillis) throws IOException
  {
    String endpoint = baseUrl + "/executions/" + executionId + "?waitMillis=" + waitMillis;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .GET()
      .timeout(Duration.ofMillis(waitMillis))
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
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

  public ApiResponse executeTask(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/executions";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .header("Content-Type", "application/json")
      .PUT(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      int responseCode = response.statusCode();
      String body = (responseCode == 200 || responseCode == 201)
        ? response.body()
        : response.body();
      return new ApiResponse(responseCode, body != null ? body : "");
    }
    catch (InterruptedException e)
    {
      Thread.currentThread().interrupt();
      throw new IOException("Request interrupted", e);
    }
  }

  public ApiResponse deleteTaskExecution(String executionId) throws IOException
  {
    String endpoint = baseUrl + "/executions/" + executionId;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Authorization", authorizationHeader)
      .header("Accept", "application/json")
      .DELETE()
      .build();

    try
    {
      HttpResponse<String> response =  client.send(request, HttpResponse.BodyHandlers.ofString());
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

  public ApiResponse putTaskData(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/data";

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .header("Content-Type", "application/json")
      .PUT(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
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

  public ApiResponse getTaskDataById(String dataId) throws IOException
  {
    String endpoint = baseUrl + "/data/" + dataId;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .GET()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
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

  public ApiResponse deleteTaskDataById(String dataId) throws IOException
  {
    String endpoint = baseUrl + "/data/" + dataId;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .DELETE()
      .build();

    try
    {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
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
