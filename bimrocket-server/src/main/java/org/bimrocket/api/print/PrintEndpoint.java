/*
 * BIMROCKET
 *
 * Copyright (C) 2021, Ajuntament de Sant Feliu de Llobregat
 *
 * This program is licensed and may be used, modified and redistributed under
 * the terms of the European Public License (EUPL), either version 1.1 or (at
 * your option) any later version as soon as they are approved by the European
 * Commission.
 *
 * Alternatively, you may redistribute and/or modify this program under the
 * terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either  version 3 of the License, or (at your option)
 * any later version.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the licenses for the specific language governing permissions, limitations
 * and more details.
 *
 * You should have received a copy of the EUPL1.1 and the LGPLv3 licenses along
 * with this program; if not, you may find them at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 * http://www.gnu.org/licenses/
 * and
 * https://www.gnu.org/licenses/lgpl.txt
 */
package org.bimrocket.api.print;

import com.lowagie.text.Document;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.PermitAll;
import jakarta.servlet.ServletContext;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import org.apache.commons.io.IOUtils;
import static jakarta.ws.rs.core.MediaType.TEXT_PLAIN;
import static jakarta.ws.rs.core.Response.Status.INTERNAL_SERVER_ERROR;

/**
 *
 * @author realor
 */
@Path("print")
@Tag(name="Print", description="PDF print service")
public class PrintEndpoint
{
  public static final String BASE_PROPERTY = "print.baseProperty";
  public static final String BASE_DIRECTORY = "print.baseDirectory";
  
  @Context
  ServletContext servletContext;
  
  @POST
  @Path("/{filename}")
  @PermitAll
  @Consumes(TEXT_PLAIN)
  public Response print(@PathParam("filename") String filename,
    InputStream input)
  {
    try
    {
      File file = getFile(filename);
      try (FileOutputStream output = new FileOutputStream(file);
           Document document = new Document())
      {
        PdfWriter writer = PdfWriter.getInstance(document, output);
        document.open();
        document.addTitle(filename);
        document.addCreator("PrintService");
        PdfContentByte canvas = writer.getDirectContent();
        try (BufferedReader reader =
             new BufferedReader(new InputStreamReader(input, "UTF-8")))
        {
          drawElements(reader, canvas);
        }
      }
      return Response.ok().build();
    }
    catch (Exception ex)
    {
      return Response.status(INTERNAL_SERVER_ERROR).build();
    }
  }

  @GET
  @Path("/{filename}")
  @PermitAll
  @Produces("application/pdf")
  public Response print(@PathParam("filename") String filename)
  {
    File file = getFile(filename);
    if (!file.exists()) return Response.ok().build();

    StreamingOutput output = (OutputStream out) ->
    {
      try (FileInputStream fis = new FileInputStream(file))
      {
        IOUtils.copy(fis, out);
      }
    };
    return Response.ok(output).build();
  }

  private void drawElements(BufferedReader reader, PdfContentByte canvas)
    throws IOException
  {
    canvas.setLineWidth(0.1f);
    canvas.setLineCap(PdfContentByte.LINE_CAP_ROUND);
    String line = reader.readLine();
    while (line != null)
    {
      String[] parts = line.split(" ");
      if (parts.length > 0)
      {
        String command = parts[0];
        if (command.equals("moveto"))
        {
          float x = Float.parseFloat(parts[1]);
          float y = Float.parseFloat(parts[2]);
          canvas.moveTo(x, y);
        }
        else if (command.equals("lineto"))
        {
          float x = Float.parseFloat(parts[1]);
          float y = Float.parseFloat(parts[2]);
          canvas.lineTo(x, y);
        }
        else if (command.equals("stroke"))
        {
          canvas.stroke();
        }
      }
      line = reader.readLine();
    }
  }

  private File getFile(String filename)
  {
    return new File(getBaseDir(), filename);
  }

  private File getBaseDir()
  {
    String baseProperty = servletContext.getInitParameter(BASE_PROPERTY);
    String baseDirectory = servletContext.getInitParameter(BASE_DIRECTORY);
    String basePath = System.getProperty(baseProperty);
    File baseDir = new File(basePath, baseDirectory);
    if (!baseDir.exists())
    {
      baseDir.mkdirs();
    }
    return baseDir;
  }
}
