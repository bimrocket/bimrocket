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
package org.bimrocket.step.io;

import java.io.File;
import java.io.PrintWriter;
import java.io.Reader;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.data.GenericData;
import org.bimrocket.express.io.ExpressLoader;
import org.bimrocket.util.Chronometer;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import org.junit.jupiter.api.Test;

/**
 *
 * @author realor
 */
public class StepIOTest
{
  public GenericData load(String resource) throws Exception
  {
    ExpressLoader schemaLoader = new ExpressLoader();
    ExpressSchema schema = schemaLoader.load("schema:IFC4");
    GenericData data = new GenericData(schema);

    URL url = getClass().getResource(resource);
    if (url == null)
      throw new RuntimeException("Resource not found: " + resource);

    var loader = new StepLoader(data);
    try (Reader reader = Files.newBufferedReader(Paths.get(url.toURI()),
         StandardCharsets.UTF_8))
    {
      loader.load(reader);
    }
    return data;
  }

  public void export(GenericData data)
  {
    var exporter = new StepExporter(data);
    try (PrintWriter writer = new PrintWriter(System.out))
    {
      exporter.export(writer);
    }
  }

  @Test
  void loadAndExport()
  {
    assertDoesNotThrow(() ->
    {
      var data = load("/org/bimrocket/ifc/models/Sample.ifc");
      export(data);
    });
  }

  public static void main(String[] args)
  {
    try
    {
      var path = System.getProperty("user.home") +
        "/bimrocket/cloudfs/models/PUBLIC/";

      var filenames = List.of(
        "AJU_3-20_ARQ_GEN_IFC4",
        "AC20-FZK-Haus",
        "Basic");

      ExpressLoader schemaLoader = new ExpressLoader();
      ExpressSchema schema = schemaLoader.load("schema:IFC4");
      System.out.println("SCHEMA:" + schema.getName());

      var chrono = new Chronometer();

      for (String filename : filenames)
      {
        System.out.println();

        File file = new File(path + filename + ".ifc");
        if (!file.exists()) continue;

        GenericData data = new GenericData(schema);

        chrono.mark();
        var loader = new StepLoader(data);
        loader.load(file);
        System.out.println("LOAD '" + filename + "' in " + chrono.seconds() + " sec.");

        chrono.mark();
        var exporter = new StepExporter(data);
        exporter.setBackwardReferences(false);
        exporter.export(path + filename + "-2.ifc");
        System.out.println("EXPORT '" + filename + "' in " + chrono.seconds() + " sec.");
      }
    }
    catch (Exception ex)
    {
      ex.printStackTrace();
    }
  }
}
