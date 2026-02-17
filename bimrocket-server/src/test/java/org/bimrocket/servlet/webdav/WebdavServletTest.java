package org.bimrocket.servlet.webdav;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import java.io.*;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.bimrocket.service.file.*;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.api.security.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class WebdavServletTest {

    @Mock
    private FileService fileService;

    @Mock
    private SecurityService securityService;

    @InjectMocks
    private WebdavServlet servlet;

    @BeforeEach
    void init() {
        MockitoAnnotations.openMocks(this);
    }

    private HttpServletRequest mockRequest(String method, String uri) throws IOException
    {
      HttpServletRequest request = mock(HttpServletRequest.class);
      when(request.getContextPath()).thenReturn("/api");
      when(request.getServletPath()).thenReturn("/cloudfs");
      when(request.getRequestURI()).thenReturn(uri);
      when(request.getMethod()).thenReturn(method);
      when(request.getHeader("Destination")).thenReturn("/api/cloudfs/models/autoritzacio_ambiental/model.ifc");
      when(request.getHeader("If-None-Match")).thenReturn(null);
      return request;
    }

    private HttpServletResponse mockResponse(ByteArrayOutputStream baos) throws IOException
    {
      HttpServletResponse response = mock(HttpServletResponse.class);
      ServletOutputStream sos = new ServletOutputStream()
      {
        @Override
        public void write(int b) { baos.write(b); }
        @Override public boolean isReady() { return true; }
        @Override public void setWriteListener(jakarta.servlet.WriteListener writeListener) {}
      };
      when(response.getOutputStream()).thenReturn(sos);
      PrintWriter writer = new PrintWriter(new OutputStreamWriter(baos));
      when(response.getWriter()).thenReturn(writer);
      return response;
    }

    @Test
    void testDoGetFile() throws Exception
    {
      HttpServletRequest request = mockRequest("GET", "/api/cloudfs/models/autoritzacio_ambiental/model.ifc");
      ByteArrayOutputStream baos = new ByteArrayOutputStream();
      HttpServletResponse response = mockResponse(baos);

      Metadata metadata = mock(Metadata.class);
      when(metadata.isCollection()).thenReturn(false);
      when(metadata.getContentType()).thenReturn("text/plain");
      when(metadata.getContentLength()).thenReturn(11L);
      when(metadata.getLastModifiedDate()).thenReturn(System.currentTimeMillis());
      when(metadata.getEtag()).thenReturn(null);

      when(fileService.get(any())).thenReturn(metadata);
      when(fileService.read(any())).thenReturn(new ByteArrayInputStream("Content IFC".getBytes()));

      servlet.doGet(request, response);

      verify(response).setContentType("text/plain");
      verify(response).setContentLengthLong(11L);
      assertEquals("Content IFC", baos.toString().trim());
    }

    @Test
    void testDoMkcol() throws Exception
    {
      HttpServletRequest request = mockRequest("MKCOL", "/api/cloudfs/models/autoritzacio_ambiental");
      ByteArrayOutputStream baos = new ByteArrayOutputStream();
      HttpServletResponse response = mockResponse(baos);

      servlet.doMkcol(request, response);

      verify(fileService).makeCollection(any());
      verify(response).setStatus(201);
    }

    @Test
    void testDoPut() throws Exception
    {
      HttpServletRequest request = mockRequest("PUT", "/api/cloudfs/models/autoritzacio_ambiental/model.ifc");
      HttpServletResponse response = mockResponse(new ByteArrayOutputStream());

      String content = "File Content";
      when(request.getInputStream()).thenReturn(new jakarta.servlet.ServletInputStream()
      {
        ByteArrayInputStream bais = new ByteArrayInputStream(content.getBytes());
        @Override public int read() { return bais.read(); }

        @Override
        public boolean isFinished() {
                return false;
            }

        @Override public boolean isReady() { return true; }
        @Override public void setReadListener(jakarta.servlet.ReadListener readListener) {}
      });
      when(request.getContentType()).thenReturn("text/plain");

      servlet.doPut(request, response);

      verify(fileService).write(any(), any(InputStream.class), eq("text/plain"));
    }

    @Test
    void testDoDelete() throws Exception
    {
      HttpServletRequest request = mockRequest("DELETE", "/api/cloudfs/models/autoritzacio_ambiental/model.ifc");
      HttpServletResponse response = mockResponse(new ByteArrayOutputStream());

      servlet.doDelete(request, response);

      verify(fileService).delete(any());
      verify(response).setStatus(204);
    }

    @Test
    void testDoAcl() throws Exception
    {
      HttpServletRequest request = mockRequest("ACL", "/api/cloudfs/.acl");
      ByteArrayOutputStream baos = new ByteArrayOutputStream();
      HttpServletResponse response = mockResponse(baos);

      String aclXml = getXMLCloudfs();
      BufferedReader reader = new BufferedReader(new StringReader(aclXml));
      when(request.getReader()).thenReturn(reader);

      User user = mock(User.class);
      when(user.getId()).thenReturn("seguser");
      when(securityService.getCurrentUser()).thenReturn(user);

      servlet.doAcl(request, response);

      verify(fileService).setACL(any(), any());
      verify(response).setStatus(200);
    }

    @Test
    void testDoOptions() throws Exception
    {
      HttpServletRequest request = mockRequest("OPTIONS", "/api/cloudfs/models/autoritzacio_ambiental/model.ifc");
      HttpServletResponse response = mockResponse(new ByteArrayOutputStream());

      servlet.doOptions(request, response);

      verify(response).setHeader(eq("DAV"), eq("1,2"));
      verify(response).setHeader(eq("Allow"), anyString());
      verify(response).setHeader(eq("MS-Author-Via"), eq("DAV"));
    }

    private String getXMLCloudfs()
    {
      return """
        <?xml version="1.0" encoding="utf-8"?>
        <D:acl xmlns:D="DAV:">
    
        <!-- Access for PROJECTISTA -->
        <D:ace>
            <D:principal>
                <D:href>PROJECTISTA</D:href>
            </D:principal>
            <D:grant>
                <D:privilege><D:read/></D:privilege>
            </D:grant>
        </D:ace>
    
        <!-- Access for VECTOR-UT-OGE -->
        <D:ace>
            <D:principal>
                <D:href>VECTOR-UT-OGE</D:href>
            </D:principal>
            <D:grant>
                <D:privilege><D:read/></D:privilege>
            </D:grant>
        </D:ace>
    
        <!-- Access for all users -->
        <D:ace>
            <D:principal>
                <D:all/>
            </D:principal>
            <D:grant>
                <D:privilege><D:read/></D:privilege>
            </D:grant>
        </D:ace>
    
        <!-- Access for ADMIN -->
        <D:ace>
            <D:principal>
                <D:href>ADMIN</D:href>
            </D:principal>
            <D:grant>
                <D:privilege><D:write/></D:privilege>
                <D:privilege><D:read-acl/></D:privilege>
                <D:privilege><D:write-acl/></D:privilege>
            </D:grant>
        </D:ace>
    
        </D:acl>
        """;
    }

}

