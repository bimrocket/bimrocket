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
package org.bimrocket.service.file;

/**
 *
 * @author realor
 */
public class MimeTypeMap
{
  public static String getContentType(String extension)
  {
    extension = extension.toLowerCase();
    if (extension.equals("js")) return "text/javascript";
    if (extension.equals("mjs")) return "text/javascript";
    if (extension.equals("txt")) return "text/plain";
    if (extension.equals("json")) return "application/json";
    if (extension.equals("properties")) return "text/plain";
    if (extension.equals("xml")) return "text/xml";
    if (extension.equals("dae")) return "model/vnd.collada+xml";
    if (extension.equals("obj")) return "model/obj";
    if (extension.equals("stl")) return "model/stl";
    if (extension.equals("mtl")) return "model/mtl";
    if (extension.equals("3mf")) return "model/3mf";
    if (extension.equals("ifc")) return "application/x-step";
    if (extension.equals("ifcxml")) return "application/xml";
    if (extension.equals("gltf")) return "model/gltf+json";
    if (extension.equals("glb")) return "model/gltf-binary";
    if (extension.equals("pdf")) return "application/pdf";
    if (extension.equals("png")) return "image/png";
    if (extension.equals("jpeg")) return "image/jpeg";
    if (extension.equals("svg")) return "image/svg+xml";
    if (extension.equals("tiff")) return "image/tiff";

    return "application/octet-stream";
  }}
