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
package org.bimrocket.api;

import org.bimrocket.exception.NotFoundException;
import org.bimrocket.exception.InvalidRequestException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.exception.NotAuthorizedException;

/**
 *
 * @author realor
 */
public class ApiExceptionMapper
{
  @Provider
  public static class NotFoundExceptionMapper
    implements ExceptionMapper<NotFoundException>
  {
    @Override
    public Response toResponse(NotFoundException ex)
    {
      ApiResult error = new ApiResult();

      error.setCode(404);
      String message = ex.getMessage();
      if (message == null)
      {
        message = ex.toString();
      }
      error.setMessage(message);
      return Response.status(404).entity(error).build();
    }
  }

  @Provider
  public static class InvalidRequestExceptionMapper
    implements ExceptionMapper<InvalidRequestException>
  {
    @Override
    public Response toResponse(InvalidRequestException ex)
    {
      ApiResult error = new ApiResult();

      error.setCode(400);
      String message = ex.getMessage();
      if (message == null)
      {
        message = ex.toString();
      }
      error.setMessage(message);
      return Response.status(400).entity(error).build();
    }
  }

  @Provider
  public static class NotAuthorizedExceptionMapper
    implements ExceptionMapper<NotAuthorizedException>
  {
    @Override
    public Response toResponse(NotAuthorizedException ex)
    {
      ApiResult error = new ApiResult();

      error.setCode(401);
      String message = ex.getMessage();
      if (message == null)
      {
        message = ex.toString();
      }
      error.setMessage(message);
      return Response.status(401).entity(error).build();
    }
  }

  @Provider
  public static class AccessDeniedExceptionMapper
    implements ExceptionMapper<AccessDeniedException>
  {
    @Override
    public Response toResponse(AccessDeniedException ex)
    {
      ApiResult error = new ApiResult();

      error.setCode(403);
      String message = ex.getMessage();
      if (message == null)
      {
        message = ex.toString();
      }
      error.setMessage(message);
      return Response.status(403).entity(error).build();
    }
  }

  @Provider
  public static class DefaultExceptionMapper
    implements ExceptionMapper<Exception>
  {
    @Override
    public Response toResponse(Exception ex)
    {
      ApiResult error = new ApiResult();

      error.setCode(500);
      String message = ex.getMessage();
      if (message == null)
      {
        message = ex.toString();
      }
      error.setMessage(message);
      return Response.serverError().entity(error).build();
    }
  }
}
