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

package org.bimrocket.generators;

import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Iterator;
import java.util.List;
import org.bimrocket.express.ExpressCollection;
import org.bimrocket.express.ExpressAttribute;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressEnumeration;
import org.bimrocket.express.ExpressNamedType;
import org.bimrocket.express.ExpressPrimitive;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;
import org.bimrocket.express.io.ExpressLoader;
import static org.bimrocket.express.ExpressCollection.SET;
import org.bimrocket.express.ExpressConstant;
import static org.bimrocket.express.ExpressPrimitive.*;
import org.bimrocket.express.ExpressSelect;

/**
 *
 * @author realor
 */
public class IfcJavaClassesGenerator
{
  private String packageName = "org.ifcserver.schema";
  private String baseEntityClassName = "IfcBaseEntity";
  private String baseTypeClassName = "IfcBaseType";

  public String getPackageName()
  {
    return packageName;
  }

  public void setPackageName(String packageName)
  {
    this.packageName = packageName;
  }

  public String getBaseEntityClassName()
  {
    return baseEntityClassName;
  }

  public void setBaseEntityClassName(String baseClassName)
  {
    this.baseEntityClassName = baseClassName;
  }

  public String getBaseTypeClassName()
  {
    return baseTypeClassName;
  }

  public void setBaseTypeClassName(String baseTypeClassName)
  {
    this.baseTypeClassName = baseTypeClassName;
  }

  public void generateClasses(String schemaFileName, File outputDir)
    throws IOException
  {
    ExpressLoader loader = new ExpressLoader();
    ExpressSchema schema = loader.load(schemaFileName);

    prepareSchema(schema);

    String classPath = packageName.replaceAll("\\.", "/");
    File classDir = new File(outputDir, classPath);
    classDir.mkdirs();

    generateBaseClass(baseEntityClassName, classDir);
    generateBaseClass(baseTypeClassName, classDir);

    List<ExpressEntity> entities = schema.getNamedTypes(ExpressEntity.class);
    for (ExpressEntity entity : entities)
    {
      generateEntityClass(entity, classDir);
    }

    List<ExpressDefinedType> definedTypes =
      schema.getNamedTypes(ExpressDefinedType.class);
    for (ExpressDefinedType definedType : definedTypes)
    {
      generateDefinedTypeClass(definedType, classDir);
    }

    List<ExpressEnumeration> enumTypes =
      schema.getNamedTypes(ExpressEnumeration.class);
    for (ExpressEnumeration enumType : enumTypes)
    {
      generateEnumerationClass(enumType, classDir);
    }
  }

  protected void prepareSchema(ExpressSchema schema)
  {
    List<ExpressEntity> entities = schema.getNamedTypes(ExpressEntity.class);
    for (ExpressEntity entity : entities)
    {
      List<ExpressAttribute> attributes = entity.getAttributes();
      for (ExpressAttribute attribute : attributes)
      {
        ExpressType type = attribute.getType();
        if (type instanceof ExpressCollection)
        {
          ExpressCollection outerType = (ExpressCollection)type;
          ExpressType outerElementType = outerType.getItemType();
          if (outerElementType instanceof ExpressCollection)
          {
            System.out.println(entity.getTypeName() + "." + attribute.getName());

            ExpressCollection innerType = (ExpressCollection)outerElementType;
            ExpressType innerElementType = innerType.getItemType();

            String collectionClassName = getJavaCollectionClassName(innerType);
            String elementClassName;
            if (innerElementType instanceof ExpressNamedType)
            {
              elementClassName = ((ExpressNamedType)innerElementType).getTypeName();
            }
            else
            {
              throw new RuntimeException("Not supported type: " + type);
            }
            String className = elementClassName + "_" + collectionClassName;
            if (schema.getNamedType(className) == null)
            {
              ExpressDefinedType definedType =
                new ExpressDefinedType(className);
              ExpressCollection collectionType =
                new ExpressCollection(innerType.getTypeName());
              collectionType.setItemType(innerElementType);
              definedType.setDefinition(collectionType);
              schema.addNamedType(definedType);
              outerType.setItemType(definedType);
              System.out.println("Created defined type: " + definedType);
            }
          }
        }
      }
    }
  }

  protected void generateBaseClass(String className, File classDir)
    throws IOException
  {
    File file = new File(classDir, className + ".java");
    PrintWriter writer = new PrintWriter(file);
    try
    {
      writer.println("package " + packageName + ";");
      writer.println();
      writer.println("public class " + className);
      writer.println("{");
      writer.println("}");
    }
    finally
    {
      writer.close();
    }
  }

  protected void generateEntityClass(ExpressEntity entity, File classDir)
    throws IOException
  {
    File file = new File(classDir, entity.getTypeName() + ".java");
    PrintWriter writer = new PrintWriter(file);
    try
    {
      ExpressEntity superEntity = entity.getSuperEntity();

      // write this entity
      writer.println("package " + packageName + ";");
      writer.println();
      writer.println("import java.util.*;");
      writer.println();

      writer.print("public class " + entity.getTypeName());
      String superClassName =
        superEntity == null ? baseEntityClassName : superEntity.getTypeName();
      writer.print(" extends " + superClassName);

      writer.println();
      writer.println("{");

      List<ExpressAttribute> attributes = entity.getAttributes();
      if (!attributes.isEmpty())
      {
        for (ExpressAttribute attribute : attributes)
        {
          ExpressType type = attribute.getType();
          String className = getJavaClassName(type);
          writer.print("  private ");
          writer.print(className);
          writer.print(" " + attribute.getName() + ";");
          writer.println(" // " + type);
        }

        for (ExpressAttribute attribute : attributes)
        {
          ExpressType type = attribute.getType();
          String className = getJavaClassName(type);
          writer.println();
          writer.print("  public ");
          writer.print(className);
          writer.println(" get" + attribute.getName() + "()");
          writer.println("  {");
          writer.println("    return " + attribute.getName() + ";");
          writer.println("  }");

          writer.println();
          writer.print("  public ");
          writer.print(entity.getTypeName());
          writer.print(" set" + attribute.getName() + "(");
          writer.print(className);
          writer.println(" value)");
          writer.println("  {");
          writer.println("    this." + attribute.getName() + " = value;");
          writer.println("    return this;");
          writer.println("  }");
        }
      }
      writer.println("}");
    }
    finally
    {
      writer.close();
    }
  }

  protected void generateDefinedTypeClass(ExpressDefinedType definedType,
    File classDir) throws IOException
  {
    File file = new File(classDir, definedType.getTypeName() + ".java");
    PrintWriter writer = new PrintWriter(file);
    try
    {
      writer.println("package " + packageName + ";");
      writer.println();
      writer.println("import java.util.*;");
      writer.println();

      ExpressType definition = definedType.getDefinition();

      if (definition instanceof ExpressNamedType)
      {
        ExpressNamedType namedType = (ExpressNamedType)definition;
        writer.println("public class " + definedType.getTypeName() + " extends " +
          namedType.getTypeName());
        writer.println("{");
        if (namedType instanceof ExpressDefinedType)
        {
          ExpressType rootType =
            getRootType((ExpressDefinedType)namedType);
          writer.println("  public " + definedType.getTypeName() + "()");
          writer.println("  {");
          writer.println("  }");
          writer.println();

          writer.println("  public " + definedType.getTypeName() +
            "(" + getJavaClassName(rootType) + " value)");
          writer.println("  {");
          writer.println("    super(value);");
          writer.println("  }");
        }
        writer.println("}");
      }
      else // ExpressPrimitive or ExpressCollection
      {
        String className = getJavaClassName(definition);

        writer.println("public class " + definedType.getTypeName() +
          " extends " + baseTypeClassName);
        writer.println("{");
        writer.print("  private ");
        writer.println(className + " value;");

        writer.println();
        writer.println("  public " + definedType.getTypeName() + "()");
        writer.println("  {");
        writer.println("  }");

        writer.println();
        writer.println("  public " + definedType.getTypeName() +
          "(" + className + " value)");
        writer.println("  {");
        writer.println("    this.value = value;");
        writer.println("  }");

        writer.println();
        writer.print("  public ");
        writer.print(className);
        writer.println(" getValue()");
        writer.println("  {");
        writer.println("    return value;");
        writer.println("  }");

        writer.println();
        writer.print("  public void setValue(");
        writer.print(className);
        writer.println(" value)");
        writer.println("  {");
        writer.println("    this.value = value;");
        writer.println("  }");

        writer.println("}");
      }
    }
    finally
    {
      writer.close();
    }
  }

  protected void generateEnumerationClass(ExpressEnumeration enumType,
    File classDir) throws IOException
  {
    File file = new File(classDir, enumType.getTypeName() + ".java");
    PrintWriter writer = new PrintWriter(file);
    try
    {
      writer.println("package " + packageName + ";");
      writer.println();

      writer.println("public enum " + enumType.getTypeName());
      writer.println("{");
      List<ExpressConstant> values = enumType.getValues();
      Iterator<ExpressConstant> iter = values.iterator();
      writer.print("  " + iter.next());
      while (iter.hasNext())
      {
        writer.println(",");
        writer.print("  " + iter.next());
      }
      writer.println();
      writer.println("}");
    }
    finally
    {
      writer.close();
    }
  }

  protected String getJavaClassName(ExpressType type)
  {
    String className;
    if (type instanceof ExpressPrimitive)
    {
      className = getJavaPrimitiveClassName(((ExpressPrimitive)type));
    }
    else if (type instanceof ExpressCollection)
    {
      ExpressCollection collectionType = (ExpressCollection)type;
      String collectionClassName = getJavaCollectionClassName(collectionType);
      ExpressType elementType = collectionType.getItemType();
      String elementClassName = getJavaClassName(elementType);
      className = collectionClassName + "<" + elementClassName + ">";
    }
    else if (type instanceof ExpressEntity)
    {
      className = ((ExpressEntity)type).getTypeName();
    }
    else if (type instanceof ExpressSelect)
    {
      List<ExpressNamedType> options = ((ExpressSelect)type).getOptions();
      ExpressNamedType namedType = options.get(0);
      if (namedType instanceof ExpressEntity)
      {
        className = baseEntityClassName;
      }
      else
      {
        className = baseTypeClassName;
      }
    }
    else if (type instanceof ExpressEnumeration)
    {
      className = ((ExpressEnumeration)type).getTypeName();
    }
    else if (type instanceof ExpressDefinedType)
    {
      className = ((ExpressDefinedType)type).getTypeName();
    }
    else
    {
      className = baseTypeClassName;
    }
    return className;
  }

  protected String getJavaPrimitiveClassName(ExpressPrimitive primitiveType)
  {
    switch (primitiveType.getTypeName())
    {
      case STRING:
        return "String";
      case INTEGER:
        return "Integer";
      case BOOLEAN:
      case LOGICAL:
        return "Boolean";
      case NUMBER:
      case REAL:
        return "Double";
      case BINARY:
        return "byte[]";
      default:
        return "String";
    }
  }

  protected String getJavaCollectionClassName(ExpressCollection collectionType)
  {
    switch (collectionType.getTypeName())
    {
      case SET:
        return "Set";
      default:
        return "List";
    }
  }

  protected ExpressType getRootType(ExpressDefinedType definedType)
  {
    ExpressType definition = definedType.getDefinition();
    while (definition instanceof ExpressDefinedType)
    {
      definition = ((ExpressDefinedType)definition).getDefinition();
    }
    return definition;
  }

  /*
    special classes:
  IfcRoot : IfcBaseEntity
  IfcLanguageId: IfcBaseType extends IfcBaseType
  IfcAsset : selects
  IfcLineIndex : aggretate basetype

  */

  public static void main(String[] args) throws IOException
  {
    if (args.length < 2)
    {
      System.out.println("Arguments: schemaFile outputDir " +
        "[-p:packageName]");
    }
    else
    {
      IfcJavaClassesGenerator generator =
        new IfcJavaClassesGenerator();

      String schemaFileName = null;
      File outputDir = null;

      for (String arg : args)
      {
        if (arg.startsWith("-p:"))
        {
          generator.setPackageName(arg.substring(3));
        }
        else if (schemaFileName == null)
        {
          schemaFileName = arg;
        }
        else if (outputDir == null)
        {
          outputDir = new File(arg);
        }
      }
      if (schemaFileName != null && outputDir != null)
      {
        generator.generateClasses(schemaFileName, outputDir);
      }
    }
  }
}
