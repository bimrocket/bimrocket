/*
 * BIMROCKET
 *
 * Copyright (C) 2021-2025, Ajuntament de Sant Feliu de Llobregat
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
package org.bimrocket.service.print;

import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.bimrocket.api.print.PrintSource;
import org.bimrocket.api.print.PrintCommand;
import org.eclipse.microprofile.config.Config;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class PrintService
{
  static final Logger LOGGER =
    Logger.getLogger(PrintService.class.getName());

  static final String BASE = "services.print.";

  @Inject
  Config config;

  File baseDir;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init PrintService");

    String baseProperty =
      config.getOptionalValue(BASE + "property", String.class)
        .orElse("user.home");

    String baseDirectory =
      config.getOptionalValue(BASE + "directory", String.class)
        .orElse("print");

    String basePath = System.getProperty(baseProperty);
    baseDir = new File(basePath, baseDirectory);
    if (!baseDir.exists())
    {
      baseDir.mkdirs();
    }
    LOGGER.log(Level.INFO, "Base dir: {0}", baseDir);
  }

  public String print(PrintSource printSource) throws IOException
  {
    String printId = UUID.randomUUID().toString().replaceAll("-", "");

    String title = printSource.getTitle();
    if (StringUtils.isBlank(title))
    {
      title = config.getValue(BASE + "title", String.class);
    }

    File file = getFile(printId);

    try (FileOutputStream output = new FileOutputStream(file);
         Document document = new Document())
    {
      PdfWriter writer = PdfWriter.getInstance(document, output);
      document.open();
      document.addTitle(title);
      document.addCreator(config.getValue(BASE + "creator", String.class));
      document.add(new Paragraph(title));

      PdfContentByte canvas = writer.getDirectContent();
      drawElements(printSource, canvas);
      LOGGER.log(Level.INFO, "Geometry printed to file {0}",
        file.getAbsoluteFile());
    }
    return printId;
  }

  public void copy(String printId, OutputStream output) throws IOException
  {
    File file = getFile(printId);

    try (FileInputStream fis = new FileInputStream(file))
    {
      IOUtils.copy(fis, output);
    }
    LOGGER.log(Level.INFO, "File {0} sent.", file.getAbsoluteFile());
  }

  private void drawElements(PrintSource printSource, PdfContentByte canvas)
    throws IOException
  {
    canvas.setLineWidth(0.1f);
    canvas.setLineCap(PdfContentByte.LINE_CAP_ROUND);
    for (PrintCommand command : printSource.getCommands())
    {
      String type = command.getType();
      List<? extends Object> args = command.getArguments();

      switch (type)
      {
        case "moveto":
          {
            float x = ((Number)args.get(0)).floatValue();
            float y = ((Number)args.get(1)).floatValue();
            canvas.moveTo(x, y);
            break;
          }
        case "lineto":
          {
            float x = ((Number)args.get(0)).floatValue();
            float y = ((Number)args.get(1)).floatValue();
            canvas.lineTo(x, y);
            break;
          }
        case "stroke":
          canvas.stroke();
          break;
        default:
          break;
      }
    }
  }

  private File getFile(String printId)
  {
    return new File(baseDir, "print-" + printId + ".pdf");
  }
}
