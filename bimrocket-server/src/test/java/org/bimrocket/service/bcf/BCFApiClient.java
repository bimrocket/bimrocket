package org.bimrocket.service.bcf;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Scanner;

public class BCFApiClient
{
  private final String baseUrl;
  private final String authorizationHeader;

  public BCFApiClient(String baseUrl, String username, String password)
  {
    this.baseUrl = baseUrl;
    String auth = username + ":" + password;
    this.authorizationHeader = "Basic " + Base64.getEncoder().encodeToString(auth.getBytes());
  }

  public ApiResponse getAllProjects() throws IOException
  {
    URL url = new URL(baseUrl);
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

  public ApiResponse getAllProjectsWithFilter(String filter, String orderBy) throws IOException
  {
    String queryParams = "?$filter=" + URLEncoder.encode(filter, StandardCharsets.UTF_8)
            + "&$orderBy=" + URLEncoder.encode(orderBy, StandardCharsets.UTF_8);
    String endpoint = baseUrl + queryParams;

    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("GET");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode =  connection.getResponseCode();

    String body = "";
    try (InputStream stream = (responseCode < 400) ? connection.getInputStream() : connection.getErrorStream())
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

  public ApiResponse getProject(String projectId) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId;
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("GET");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode = connection.getResponseCode();

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

  public ApiResponse updateProject(String projectId, String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId;
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("PUT");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);
    connection.setRequestProperty("Content-Type", "application/json");
    connection.setDoOutput(true);

    // Body for PUT
    try (OutputStream os = connection.getOutputStream())
    {
      os.write(jsonPayload.getBytes());
      os.flush();
    }

    int responseCode = connection.getResponseCode();

    String body = "";
    if (responseCode == 200 || responseCode == 201)
    {
      try (Scanner scanner = new Scanner(connection.getInputStream(), StandardCharsets.UTF_8))
      {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
      }
    }

    return new ApiResponse(responseCode, body);
  }

  public ApiResponse deleteProject(String projectId) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId;
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("DELETE");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode = connection.getResponseCode();

    String body = "";
    if (responseCode == 200 || responseCode == 204)
    {
      try (Scanner scanner = new Scanner(connection.getInputStream(), StandardCharsets.UTF_8))
      {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
      } catch (IOException e)
      {
        // (204 No Content)
      }
    }

    return new ApiResponse(responseCode, body);
  }

  public ApiResponse getProjectExtensions(String projectId) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId + "/extensions";
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("GET");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode = connection.getResponseCode();

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

  public ApiResponse updateProjectExtensions(String projectId, String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/" + projectId + "/extensions";
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("PUT");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Content-Type", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    connection.setDoOutput(true);
    try (OutputStream os = connection.getOutputStream())
    {
      byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
      os.write(input, 0, input.length);
    }

    int responseCode = connection.getResponseCode();

    String body = "";
    try (Scanner scanner = new Scanner(connection.getInputStream(), StandardCharsets.UTF_8))
    {
      scanner.useDelimiter("\\A");
      body = scanner.hasNext() ? scanner.next() : "";
    } catch (IOException e)
    {
      // 204 without body
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
}
