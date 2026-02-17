package org.bimrocket.service.ifcdb;

import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class IfcdbApiClient
{
  private final String baseUrl;
  private final String authorizationHeader;
  private final HttpClient client = HttpClient.newHttpClient();

  public IfcdbApiClient(String baseUrl, String username, String password)
  {
    this.baseUrl = baseUrl;
    String auth = username + ":" + password;
    this.authorizationHeader = "Basic " + Base64.getEncoder().encodeToString(auth.getBytes());
  }

  public ApiResponse getAllModels(String schema) throws IOException
  {
    String endpoint = baseUrl + "/models/" + schema;

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

  public ApiResponse uploadModel(String schema, File model) throws IOException
  {
    String endpoint = baseUrl + "/models/" + schema;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(endpoint))
      .header("Accept", "application/json")
      .header("Authorization", authorizationHeader)
      .header("Content-Type", "application/x-step")
      .POST(HttpRequest.BodyPublishers.ofFile(model.toPath()))
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

  public ApiResponse putModel(String jsonPayload, String schema) throws IOException
  {
    String endpoint = baseUrl + "/models/" + schema;

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

  public ApiResponse deleteModel(String schema, String modelId, String version) throws IOException
  {
    String endpoint = baseUrl + "/models/" + schema + "/" + modelId + "/" + version;

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

  public ApiResponse getModelsVersions(String schema, String modelId) throws IOException
  {
    String endpoint = baseUrl + "/models/" + schema + "/" + modelId + "/versions";

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
