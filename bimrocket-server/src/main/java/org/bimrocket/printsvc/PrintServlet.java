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

package org.bimrocket.printsvc;

import com.lowagie.text.Document;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;

/**
 *
 * @author realor
 */
public class PrintServlet extends HttpServlet
{
  private final File printDir;
  
  public PrintServlet()
  {
    String printPath = System.getProperty("user.home") + "/printsvc";
    this.printDir = new File(printPath);
    printDir.mkdirs();
  }
  
  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    File file = getFile(req);
    if (file != null)
    {
      try (FileOutputStream os = new FileOutputStream(file); 
           Document document = new Document()) 
      {
        PdfWriter writer = PdfWriter.getInstance(document, os);
        document.open();
        document.addTitle(file.getName());
        document.addCreator("PrintService");
        PdfContentByte canvas = writer.getDirectContent();
        try (BufferedReader reader = req.getReader()) 
        {
          drawElements(reader, canvas);
        }
      }
      catch (Exception ex)
      {
        throw new IOException(ex);
      }
    }
    else
    {
      resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
    }
  }

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
    throws ServletException, IOException
  {
    File file = getFile(req);
    if (file != null)
    {
      resp.setContentType("application/pdf");
      IOUtils.copy(new FileInputStream(file), resp.getOutputStream());    
    }
    else
    {
      resp.setContentType("text/plain");
      resp.getOutputStream().print("PrintService v1.0");
    }
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
  
  protected File getFile(HttpServletRequest req)
  {
    String uri = req.getRequestURI();
    String path = req.getContextPath() + req.getServletPath();
    if (path.length() == uri.length()) return null;
    
    String filename = uri.substring(path.length() + 1);
    
    return filename.length() > 0 ? new File(printDir, filename) : null;
  }
}
