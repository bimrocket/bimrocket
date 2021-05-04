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

package org.bimrocket.cloudfs;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

/**
 *
 * @author realor
 */
public class LocalCredentialsManager implements CredentialsManager
{
  public static final String PASSWORD_FILENAME = "password.txt";
  private final File baseDir;

  public LocalCredentialsManager(File baseDir)
  {
    this.baseDir = baseDir;
  }

  @Override
  public boolean isValid(Credentials credentials)
  {
    File userDir = new File(baseDir, credentials.getUserId());
    if (!userDir.exists()) return false;

    File passwordFile = new File(userDir, PASSWORD_FILENAME);
    if (!passwordFile.exists()) return true;
    
    String password = null;
    try
    {
      BufferedReader reader =
        new BufferedReader(new FileReader(passwordFile));
      try
      {
        password = reader.readLine();
      }
      finally
      {
        reader.close();
      }
    }
    catch (IOException ex)
    {
    }
    // TODO: save a password hash SHA-256
    boolean valid = 
      password != null && password.equals(credentials.getPassword());
    return valid; 
  }
}
