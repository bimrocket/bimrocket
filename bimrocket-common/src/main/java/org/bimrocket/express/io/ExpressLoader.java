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

package org.bimrocket.express.io;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.List;
import org.bimrocket.express.*;
import static org.bimrocket.express.io.ExpressToken.*;
import static org.bimrocket.express.ExpressCollection.*;
import static org.bimrocket.express.ExpressPrimitive.*;

/**
 *
 * @author realor
 */
public class ExpressLoader
{
  public static final String SCHEMA_PREFIX = "schema:";
  private ExpressSchema schema;
  private ExpressLexer lexer;
  
  public ExpressLoader()
  {
  }
  
  public ExpressSchema load(String schemaFileName) throws IOException
  {
    if (schemaFileName.startsWith(SCHEMA_PREFIX))
    {
      schemaFileName = schemaFileName.substring(SCHEMA_PREFIX.length());
      String resource = "/org/ifcserver/schema/" + schemaFileName + ".exp";
      InputStreamReader reader = new InputStreamReader(
        ExpressLexer.class.getResourceAsStream(resource));
      return load(reader);
    }
    else
    {
      return ExpressLoader.this.load(new File(schemaFileName));
    }
  }

  public ExpressSchema load(File schemaFile) throws IOException
  {
    return load(new BufferedReader(
      new InputStreamReader(new FileInputStream(schemaFile))));
  }

  public ExpressSchema load(Reader reader) throws IOException
  {
    schema = new ExpressSchema();
    lexer = new ExpressLexer(reader);
    try
    { 
      ExpressToken token;
      if (skipUntil(KEYWORD, "SCHEMA"))
      {
        token = lexer.readToken();
        if (token.isIdentifier())
        {
          schema.setName(String.valueOf(token.getValue()));
        }
      }
      token = lexer.readToken();
      
      while (!token.isEOF())
      {
        if (token.isKeyword("ENTITY"))
        {
          readEntityDefinition();
        }
        else if (token.isKeyword("TYPE"))
        {
          readTypeDefinition();
        }
        token = lexer.readToken();
      }
    }
    finally
    {
      reader.close();
    }

    for (ExpressNamedType namedType : schema.getNamedTypes())
    {
      solveReferences(namedType);
    }

    return schema;
  }

  protected void solveReferences(ExpressNamedType namedType)
  {
    if (namedType instanceof ExpressEntity)
    {
      ExpressEntity entity = (ExpressEntity)namedType;
      ExpressEntity superEntity = entity.getSuperEntity();
      if (superEntity != null)
      {
        entity.setSuperEntity((ExpressEntity)getRealNamedType(superEntity));
      }
      for (ExpressAttribute attribute : entity.getAttributes())
      {
        ExpressType attributeType = attribute.getType();
        if (attributeType instanceof ExpressNamedType)
        {
          attribute.setType(
            getRealNamedType((ExpressNamedType)attributeType));
        }
        else if (attributeType instanceof ExpressCollection)
        {
          solveReferences((ExpressCollection)attributeType);
        }
      }
    }
    else if (namedType instanceof ExpressDefinedType)
    {
      ExpressDefinedType definedType = (ExpressDefinedType)namedType;
      ExpressType definition = definedType.getDefinition();
      if (definition instanceof ExpressNamedType)
      {
        definedType.setDefinition(
          getRealNamedType((ExpressNamedType)definition));
      }
      else if (definition instanceof ExpressCollection)
      {
        solveReferences((ExpressCollection)definition);
      }
    }
    else if (namedType instanceof ExpressSelect)
    {
      ExpressSelect selectType = (ExpressSelect)namedType;
      List<ExpressNamedType> options = selectType.getOptions();
      for (int i = 0; i < options.size(); i++)
      {
        ExpressNamedType optionType = options.get(i);
        options.set(i, getRealNamedType(optionType));
      }
    }
  }

  protected void solveReferences(ExpressCollection collectionType)
  {
    ExpressType elementType = collectionType.getElementType();
    if (elementType instanceof ExpressNamedType)
    {
      collectionType.setElementType(
        getRealNamedType((ExpressNamedType)elementType));
    }
    else if (elementType instanceof ExpressCollection)
    {
      solveReferences((ExpressCollection)elementType);
    }
  }

  protected ExpressNamedType getRealNamedType(ExpressNamedType namedType)
  {
    String typeName = namedType.getName();
    if (typeName.startsWith("#"))
    {
      typeName = typeName.substring(1);
      return schema.getNamedType(typeName);
    }
    return namedType;
  }

  protected void readEntityDefinition() throws IOException
  {
    String entityName = readIdentifier();
    if (entityName != null)
    {
      ExpressEntity entity = new ExpressEntity(entityName);
      schema.addNamedType(entity);
      if (skipUntil(KEYWORD, "SUBTYPE", SYMBOL, ";"))
      {
        if (skip(KEYWORD, "OF") && skip(SYMBOL, "("))
        {
          String superEntityName = readIdentifier();
          entity.setSuperEntity(new ExpressEntity("#" + superEntityName));
        }
        skipUntil(SYMBOL, ";");
      }
      String attributeName = readIdentifier();
      while (attributeName != null)
      {
        ExpressAttribute attribute = new ExpressAttribute(attributeName);
        entity.getAttributes().add(attribute);
        if (skip(OPERATOR, ":"))
        {
          if (skip(KEYWORD, "OPTIONAL"))
          {
            attribute.setOptional(true);
          }
          ExpressType type = readType();
          attribute.setType(type);
        }
        skipUntil(SYMBOL, ";");
        attributeName = readIdentifier();
      }
    }
  }

  protected void readTypeDefinition() throws IOException
  {
    String typeName = readIdentifier();
    if (typeName != null)
    {
      if (skip(OPERATOR, "="))
      {
        ExpressToken token = lexer.readToken();
        if (token.isIdentifier())
        {
          ExpressDefinedType definedType = new ExpressDefinedType(typeName);
          schema.addNamedType(definedType);

          String superTypeName = (String)token.getValue();
          definedType.setDefinition(new ExpressNamedType("#" + superTypeName));
        }
        else if (token.isKeyword())
        {
          String keyword = (String)token.getValue();
          if (isCollection(keyword)) // collection type
          {
            ExpressDefinedType definedType = new ExpressDefinedType(typeName);
            schema.addNamedType(definedType);

            ExpressCollection collectionType = new ExpressCollection(keyword);
            readCollectionType(collectionType);
            definedType.setDefinition(collectionType);
          }
          else if (isPrimitive(keyword)) // primitive type
          {
            ExpressDefinedType definedType = new ExpressDefinedType(typeName);
            schema.addNamedType(definedType);

            definedType.setDefinition(getPrimitive(keyword));
          }
          else if ("ENUMERATION".equals(keyword))
          {
            if (skip(KEYWORD, "OF"))
            {
              ExpressEnumeration enumType = new ExpressEnumeration(typeName);
              schema.addNamedType(enumType);

              if (skip(SYMBOL, "("))
              {
                String value = readIdentifier();
                while (value != null)
                {
                  enumType.getValues().add(value);
                  value = skip(SYMBOL, ",") ? readIdentifier() : null;
                }
                skipUntil(SYMBOL, ";");
              }
            }
          }
          else if ("SELECT".equals(keyword))
          {
            ExpressSelect selectType = new ExpressSelect(typeName);
            schema.addNamedType(selectType);

            if (skip(SYMBOL, "("))
            {
              String optionTypeName = readIdentifier();
              while (optionTypeName != null)
              {
                ExpressNamedType optionType =
                  new ExpressNamedType("#" + optionTypeName);
                selectType.getOptions().add(optionType);
                optionTypeName = skip(SYMBOL, ",") ? readIdentifier() : null;
              }
              skipUntil(SYMBOL, ";");
            }
          }
        }
        else
        {
          lexer.unreadToken(token);
        }
      }
    }
  }

  protected void readCollectionType(ExpressCollection collectionType)
    throws IOException
  {
    if (skip(SYMBOL, "["))
    {
      Double min = readNumber();
      if (min != null)
      {
        collectionType.setMinOccurrences(min.intValue());
      }
      skipUntil(OPERATOR, ":");
      Double max = readNumber();
      if (max != null)
      {
        collectionType.setMaxOccurrences(max.intValue());
      }
      skipUntil(SYMBOL, "]");
    }
    if (skip(KEYWORD, "OF"))
    {
      ExpressType elementType = readType();
      collectionType.setElementType(elementType);
    }
  }

  protected ExpressType readType() throws IOException
  {
    ExpressType type;

    skip(KEYWORD, "UNIQUE");

    ExpressToken token = lexer.readToken();
    if (token.isIdentifier())
    {
      type = new ExpressNamedType("#" + token.getValue());
    }
    else if (token.isKeyword())
    {
      String keyword = (String)token.getValue();
      if (isCollection(keyword))
      {
        ExpressCollection collectionType = new ExpressCollection(keyword);
        readCollectionType(collectionType);
        type = collectionType;
      }
      else if (isPrimitive(keyword))
      {
        type = ExpressPrimitive.getPrimitive(keyword);
      }
      else type = null;
    }
    else
    {
      lexer.unreadToken(token);
      type = null;
    }
    return type;
  }

  protected String readIdentifier() throws IOException
  {
    ExpressToken token = lexer.readToken();
    if (token.isIdentifier())
    {
      return (String)token.getValue();
    }
    else
    {
      lexer.unreadToken(token);
      return null;
    }
  }

  protected Double readNumber() throws IOException
  {
    ExpressToken token = lexer.readToken();
    if (token.isNumber())
    {
      return (Double)token.getValue();
    }
    else
    {
      lexer.unreadToken(token);
      return null;
    }
  }

  protected boolean skip(String type, String value) throws IOException
  {
    ExpressToken token = lexer.readToken();
    if (token.isEqual(type, value))
    {
      return true;
    }
    else
    {
      lexer.unreadToken(token);
      return false;
    }
  }

  protected boolean skipUntil(String type, String value) throws IOException
  {
    ExpressToken token = lexer.readToken();
    while (!token.isEOF() && !token.isEqual(type, value))
    {
      token = lexer.readToken();
    }
    return token.isEqual(type, value);
  }

  protected boolean skipUntil(String type1, String value1,
    String type2, String value2) throws IOException
  {
    ExpressToken token = lexer.readToken();
    while (!token.isEOF() && !token.isEqual(type1, value1) &&
      !token.isEqual(type2, value2))
    {
      token = lexer.readToken();
    }
    return token.isEqual(type1, value1);
  }

  public static void main(String[] args) throws IOException
  {
    ExpressLoader parser = new ExpressLoader();
    ExpressSchema schema = parser.load("schema:IFC4");

    List<ExpressEntity> entities = schema.getNamedTypes(ExpressEntity.class);
    for (ExpressEntity entity : entities)
    {
      System.out.println(entity);
      for (ExpressAttribute attribute : entity.getAttributes())
      {
        System.out.print("-" + attribute.getName());
        if (attribute.isOptional()) System.out.print(" OPTIONAL");
        if (attribute.getType() != null) 
          System.out.print(" " + attribute.getType());
        System.out.println();
      }
      System.out.println();
    }

    List<ExpressDefinedType> definedTypes = 
      schema.getNamedTypes(ExpressDefinedType.class);
    for (ExpressDefinedType definedType : definedTypes)
    {
      System.out.println(definedType);
    }

    List<ExpressSelect> selectTypes = 
      schema.getNamedTypes(ExpressSelect.class);
    for (ExpressSelect selectType : selectTypes)
    {
      System.out.println(selectType);
    }

    List<ExpressEnumeration> enumTypes = 
      schema.getNamedTypes(ExpressEnumeration.class);
    for (ExpressEnumeration enumType : enumTypes)
    {
      System.out.println(enumType);
    }
  }
}
