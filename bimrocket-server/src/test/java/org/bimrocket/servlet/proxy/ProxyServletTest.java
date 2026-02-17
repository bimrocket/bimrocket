package org.bimrocket.servlet.proxy;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;

import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.exception.NotAuthorizedException;
import org.bimrocket.service.proxy.ProxyService;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyInt;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.MockitoAnnotations;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class ProxyServletTest
{
  @InjectMocks
  private ProxyServlet servlet;

  @Mock
  private ProxyService proxyService;

  @Mock
  private HttpServletRequest request;

  @Mock
  private HttpServletResponse response;

  private StringWriter responseBody;
  private PrintWriter writer;

  @BeforeEach
  void setup() throws IOException
  {
    MockitoAnnotations.openMocks(this);
    responseBody = new StringWriter();
    writer = new PrintWriter(responseBody);
    when(response.getWriter()).thenReturn(writer);
  }

  // 200 OK
  @Test
  void testServiceOk() throws Exception
  {
    servlet.service(request, response);
    verify(proxyService, times(1)).service(request, response);
    verify(response, never()).setStatus(anyInt());
  }

  // 401 Unauthorized
  @Test
  void testServiceNotAuthorized() throws Exception
  {
    doThrow(new NotAuthorizedException("Unauthorized"))
            .when(proxyService).service(request, response);
    servlet.service(request, response);
    verify(response).setStatus(401);
    verify(response).setContentType("text/plain");
    assertEquals("Unauthorized",  responseBody.toString().trim());
  }

  // 403 Forbidden
  @Test
  void testServiceAccessDenied() throws Exception
  {
    doThrow(new AccessDeniedException("Forbidden"))
            .when(proxyService).service(request, response);
    servlet.service(request, response);
    verify(response).setStatus(403);
    verify(response).setContentType("text/plain");
    assertEquals("Forbidden", responseBody.toString().trim());
  }

  // 500 Internal Server Error
  @Test
  void testServiceGenericException() throws Exception
  {
    Exception ex = new RuntimeException("Generic Exception");
    doThrow(ex).when(proxyService).service(request, response);
    servlet.service(request, response);
    verify(response).setStatus(500);
    verify(response).setContentType("text/plain");
    assertEquals(ex.toString(), responseBody.toString().trim());
  }
}

