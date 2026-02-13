package org.bimrocket.service.security;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Scanner;

public class SecurityApiClient
{
  private final String baseUrl;
  private final String authorizationHeader;

  public SecurityApiClient(String baseUrl, String username, String password)
  {
    this.baseUrl = baseUrl;
    String auth = username + ":" + password;
    this.authorizationHeader = "Basic " + Base64.getEncoder().encodeToString(auth.getBytes());
  }

  public ApiResponse getAllRoles() throws IOException
  {
    URL url = new URL(baseUrl + "/roles");
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

  public ApiResponse getRoles(String filter, String orderBy) throws IOException
  {
    String queryParams = "?$filter=" + URLEncoder.encode(filter, StandardCharsets.UTF_8)
            + "&$orderBy=" + URLEncoder.encode(orderBy, StandardCharsets.UTF_8);
    String endpoint = baseUrl + "/roles" + queryParams;

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

  public ApiResponse getRoleById(String roleId) throws IOException
  {
    String endpoint = baseUrl + "/roles/" + roleId;

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

  public ApiResponse deleteRole(String roleId) throws IOException
  {
    String endpoint = baseUrl + "/roles/" + roleId;
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

  public ApiResponse postRole(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/roles";
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("POST");
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

  public ApiResponse putRole(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/roles";
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

  public ApiResponse getAllUsers() throws IOException
  {
    URL url = new URL(baseUrl + "/users");
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

  public ApiResponse getUsers(String filter, String orderBy) throws IOException
  {
    String queryParams = "?$filter=" + URLEncoder.encode(filter, StandardCharsets.UTF_8)
            + "&$orderBy=" + URLEncoder.encode(orderBy, StandardCharsets.UTF_8);
    String endpoint = baseUrl + "/users" + queryParams;

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

  public ApiResponse getUserById(String userId) throws IOException
  {
    String endpoint = baseUrl + "/users/" + userId;

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

  public ApiResponse deleteUser(String userId) throws IOException
  {
    String endpoint = baseUrl + "/users/" + userId;
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

  public ApiResponse postUser(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/users";
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("POST");
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

  public ApiResponse putUser(String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/users";
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

  public ApiResponse changePassword(String userId, String jsonPayload) throws IOException
  {
    String endpoint = baseUrl + "/users/" + userId + "/password";
    URL url = new URL(endpoint);
    HttpURLConnection connection = (HttpURLConnection) url.openConnection();

    connection.setRequestMethod("POST");
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

}
