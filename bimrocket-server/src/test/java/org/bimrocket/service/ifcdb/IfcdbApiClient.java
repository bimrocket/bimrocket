package org.bimrocket.service.ifcdb;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Scanner;

public class IfcdbApiClient
{
  private final String baseUrl;
  private final String authorizationHeader;

  public IfcdbApiClient(String baseUrl, String username, String password)
  {
    this.baseUrl = baseUrl;
    String auth = username + ":" + password;
    this.authorizationHeader = "Basic " + Base64.getEncoder().encodeToString(auth.getBytes());
  }

  public ApiResponse getAllModels(String schema) throws IOException
  {
    URL url = new URL(baseUrl + "/models/" + schema);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("GET");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode =  connection.getResponseCode();

    String body = "";
    if (responseCode == 200)
    {
      try (Scanner scanner = new Scanner(connection.getInputStream(), StandardCharsets.UTF_8))
      {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
      }
    }

    return new ApiResponse(responseCode, body);
  }

  public ApiResponse uploadModel(String schema, File model) throws IOException
  {
    String endpoint = baseUrl + "/models/" + schema;
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("POST");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);
    connection.setRequestProperty("Content-Type", "application/x-step");
    connection.setDoOutput(true);

    try (OutputStream os = connection.getOutputStream();
    FileInputStream fis = new FileInputStream(model))
    {
      fis.transferTo(os);
    }

    int responseCode = connection.getResponseCode();

    InputStream stream = (responseCode >= 400)
            ? connection.getErrorStream()
            : connection.getInputStream();

    String body = "";

    if (stream != null) {
      try (Scanner scanner = new Scanner(stream, StandardCharsets.UTF_8)) {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
      }
    }

    return new ApiResponse(responseCode, body);
  }

  public ApiResponse putModel(String jsonPayload, String schema) throws IOException
  {
    String endpoint = baseUrl + "/models/" + schema;
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("PUT");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);
    connection.setRequestProperty("Content-Type", "application/json");
    connection.setDoOutput(true);

    try (OutputStream os = connection.getOutputStream())
    {
      os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
      os.flush();
    }

    int responseCode = connection.getResponseCode();

    InputStream stream = (responseCode >= 400)
            ? connection.getErrorStream()
            : connection.getInputStream();

    String body = "";

    if (stream != null) {
      try (Scanner scanner = new Scanner(stream, StandardCharsets.UTF_8)) {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
      }
    }

    return new ApiResponse(responseCode, body);
  }

  public ApiResponse deleteModel(String schema, String modelId, String version) throws IOException
  {
    String endpoint = baseUrl + "/models/" + schema + "/" + modelId + "/" + version;
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
    connection.setRequestMethod("DELETE");
    connection.setRequestProperty("Authorization", authorizationHeader);
    connection.setRequestProperty("Accept", "application/json");

    int responseCode = connection.getResponseCode();

    String body = "";
    try (InputStream stream = (responseCode < 500) ? connection.getInputStream() : connection.getErrorStream())
    {
      if (stream != null)
      {
        try (Scanner scanner = new Scanner(stream, StandardCharsets.UTF_8))
        {
          scanner.useDelimiter("\\A");
          body = scanner.hasNext() ? scanner.next() : "";
        }
      }
    }

    return new ApiResponse(responseCode, body);
  }

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

  public ApiResponse getModelsVersions(String schema, String modelId) throws IOException
  {
    URL url = new URL(baseUrl + "/models/" + schema + "/" + modelId + "/versions");
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("GET");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode =  connection.getResponseCode();

    String body = "";
    if (responseCode == 200)
    {
      try (Scanner scanner = new Scanner(connection.getInputStream(), StandardCharsets.UTF_8))
      {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
      }
    }

    return new ApiResponse(responseCode, body);
  }

}
