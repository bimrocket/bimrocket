package org.bimrocket.service.task;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Scanner;

public class TaskApiClient
{
  private final String baseUrl;
  private final String authorizationHeader;

  public TaskApiClient(String baseUrl, String username, String password)
  {
    this.baseUrl = baseUrl;
    String auth = username + ":" + password;
    this.authorizationHeader = "Basic " + Base64.getEncoder().encodeToString(auth.getBytes());
  }

  public ApiResponse getTaskExecutions(String filter, String orderBy) throws IOException
  {
    String queryParams = "?$filter=" + URLEncoder.encode(filter, StandardCharsets.UTF_8)
            + "&$orderBy=" + URLEncoder.encode(orderBy, StandardCharsets.UTF_8);
    String endpoint = baseUrl + "/executions" + queryParams;

    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
    connection.setRequestMethod("GET");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode = connection.getResponseCode();

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

  public ApiResponse getTaskExecutionById(String executionId, long waitMillis) throws IOException
  {
    String endpoint = baseUrl + "/executions/" + executionId + "?waitMillis=" + waitMillis;

    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
    connection.setRequestMethod("GET");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode = connection.getResponseCode();

    String body = "";
    try (InputStream stream = (responseCode < 204) ? connection.getInputStream() : connection.getErrorStream())
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

  public ApiResponse executeTask(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/executions";
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
    InputStream stream;
    if (responseCode == 200 || responseCode == 201)
    {
      stream = connection.getInputStream();
    }
    else
    {
      stream = connection.getErrorStream();
    }

    if (stream != null)
    {
      try (Scanner scanner = new Scanner(stream, StandardCharsets.UTF_8))
      {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
      }
    }

    return new ApiResponse(responseCode, body);
  }

  public ApiResponse deleteTaskExecution(String executionId) throws IOException
  {
    String endpoint = baseUrl + "/executions/" + executionId;
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

  public ApiResponse putTaskData(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/data";
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

    String body = "";
    InputStream stream = responseCode < 400 ? connection.getInputStream() : connection.getErrorStream();
    if (stream != null)
    {
      try (Scanner scanner = new Scanner(stream, StandardCharsets.UTF_8))
      {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
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

  public ApiResponse getTaskDataById(String dataId) throws IOException
  {
    String endpoint = baseUrl + "/data/" + dataId;
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("GET");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode = connection.getResponseCode();

    String body = "";
    InputStream stream = responseCode < 204 ? connection.getInputStream() : connection.getErrorStream();
    if (stream != null)
    {
      try (Scanner scanner = new Scanner(stream, StandardCharsets.UTF_8))
      {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
      }
    }

    return new ApiResponse(responseCode, body);
  }

  public ApiResponse deleteTaskDataById(String dataId) throws IOException
  {
    String endpoint = baseUrl + "/data/" + dataId;
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("DELETE");
    connection.setRequestProperty("Accept", "application/json");
    connection.setRequestProperty("Authorization", authorizationHeader);

    int responseCode = connection.getResponseCode();

    String body = "";
    InputStream stream = responseCode < 400 ? connection.getInputStream() : connection.getErrorStream();
    if (stream != null)
    {
      try (Scanner scanner = new Scanner(stream, StandardCharsets.UTF_8))
      {
        scanner.useDelimiter("\\A");
        body = scanner.hasNext() ? scanner.next() : "";
      }
    }

    return new ApiResponse(responseCode, body);
  }
}
