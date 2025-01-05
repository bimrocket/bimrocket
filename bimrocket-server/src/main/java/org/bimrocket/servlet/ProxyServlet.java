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
package org.bimrocket.servlet;

import jakarta.inject.Inject;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.exception.NotAuthorizedException;
import org.bimrocket.service.proxy.ProxyService;

/**
 *
 * @author realor
 */
@WebServlet(name = "Proxy", urlPatterns = "/api/proxy")
public class ProxyServlet extends HttpServlet
{
  private static final long serialVersionUID = 1L;

  @Inject
  transient ProxyService proxyService;

  @Override
  protected void service(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    try
    {
      proxyService.service(request, response);
    }
    catch (NotAuthorizedException ex)
    {
      response.setStatus(401);
      response.setContentType("text/plain");
      response.getWriter().println(ex.getMessage());
    }
    catch (AccessDeniedException ex)
    {
      response.setStatus(403);
      response.setContentType("text/plain");
      response.getWriter().println(ex.getMessage());
    }
    catch (Exception ex)
    {
      response.setStatus(500);
      response.setContentType("text/plain");
      response.getWriter().println(ex.toString());
    }
  }
}
