/**
 * STEP.js
 *
 * @author realor
 */

class STEPParser
{
  constructor()
  {
    this.schema = null; // classes map
    this.constantClass = null;
    this.undefinedValue = undefined;
  }

  getSchemaTypes(schemaName)
  {
    return null;
  }

  setHeader(entity)
  {
  }

  addEntity(entity, tag)
  {
  }

  parse(text)
  {
    const t0 = Date.now();
    let tags = new Map(); // number => Entity
    let references = [];
    let lineCount = 0;

    let builder = null;
    let stack = [];
    let token = "";
    let tag = null;
    let inString = false;
    let inComment = false;

    for (let i = 0; i < text.length; i++)
    {
      let ch = text[i];
      if (inString)
      {
        if (ch === "'")
        {
          let nextCh = i < text.length - 1 ? text[i + 1] : null;
          if (nextCh === "'") // quote '' => '
          {
            token += "'";
            i++;
          }
          else
          {
            if (builder)
            {
              builder.add(this.decodeSTEPString(token));
            }
            token = "";
            inString = false;
          }
        }
        else
        {
          token += ch;
        }
      }
      else if (inComment)
      {
        token += ch;
        if (token.endsWith("*/"))
        {
          inComment = false;
          token = "";
        }
      }
      else // out of string and comment
      {
        if (ch === "'")
        {
          inString = true;
        }
        else if (ch === ' ')
        {
          // ignore
        }
        else if (ch === '(')
        {
          let typeName = token.length > 0 ? token.toUpperCase() : "Array";
          let schema = tag !== null ? this.schema : HEADER_SCHEMA;
          let newBuilder = new STEPBuilder(typeName, schema);

          if (builder) // previous builder
          {
            stack.push(builder); // save previous builder
            builder.add(newBuilder.entity);
          }
          builder = newBuilder;
          token = "";
        }
        else if (ch === ',' || ch === ')')
        {
          if (builder === null)
          {
            console.warn("Parse error in line " + (lineCount + 1));
            return null;
          }

          if (token.length > 0)
          {
            if (token === "$")
            {
              builder.add(null);
            }
            else if ("0123456789-".indexOf(token[0]) !== -1)
            {
              builder.add(parseFloat(token));
            }
            else if (token.startsWith("#"))
            {
              if (builder.entity)
              {
                let refTag = parseInt(token.trim().substring(1));
                references.push(new STEPReference(builder, refTag));
              }
              builder.add(null);
            }
            else if (token === ".T.")
            {
              builder.add(true);
            }
            else if (token === ".F.")
            {
              builder.add(false);
            }
            else if (token.startsWith(".") && token.endsWith("."))
            {
              const value = token.substring(1, token.length - 1);
              if (this.constantClass)
              {
                let constValue = new this.constantClass(value);
                builder.add(constValue);
              }
              else
              {
                builder.add(value);
              }
            }
            else if (token === "*")
            {
              builder.add(this.undefinedValue);
            }
            else
            {
              builder.add(token);
            }
            token = "";
          }
          if (ch === ')')
          {
            if (stack.length > 0)
            {
              builder = stack.pop();
            }
          }
        }
        else if (ch === ';')
        {
          if (tag !== null)
          {
            if (builder && builder.entity)
            {
              tags.set(tag, builder.entity);
              this.addEntity(builder.entity, tag);
            }
          }
          else // process header elements
          {
            if (builder)
            {
              let entity = builder.entity;
              this.setHeader(entity);

              if (entity instanceof FILE_SCHEMA)
              {
                let schemaName = entity.Schemas[0];
                this.schema = this.getSchemaTypes(schemaName);
              }
            }
          }
          token = "";
          tag = null;
          builder = null;
        }
        else if (ch === '\t')
        {
          // ignore
        }
        else if (ch === '\n')
        {
          if (i === 0 || (i > 0 && text[i - 1] !== '\r')) lineCount++;
        }
        else if (ch === '\r')
        {
          if (i === 0 || (i > 0 && text[i - 1] !== '\n')) lineCount++;
        }
        else if (ch === '=')
        {
          token = token.trim();
          if (token.startsWith("#"))
          {
            tag = parseInt(token.substring(1));
          }
          token = "";
        }
        else
        {
          token += ch;
          if (token.startsWith("/*"))
          {
            inComment = true;
          }
        }
      }
    }

    // dereference references
    for (let i = 0; i < references.length; i++)
    {
      let reference = references[i];
      let entity = reference.entity;
      let referencedInstance = tags.get(reference.tag) || null;
      if (reference.property)
      {
        entity[reference.property] = referencedInstance;
      }
      else // Array
      {
        let index = reference.index;
        entity[index] = referencedInstance;
      }
    }
    const t1 = Date.now();
    console.info("STEP File parsed in " + (t1 - t0) + " millis.");
    console.info("File contains " + lineCount + " lines.");
  }

  decodeSTEPString(str)
  {
    return str.replace(/\\X2\\[\dA-F]{4}\\X0\\|\\X\\[\dA-F]{2}/gi,
      match =>
      {
        const code = match.length === 12 ?
          match.substring(4, 8) : match.substring(3, 5);
        return String.fromCharCode(parseInt(code, 16));
      });
  }
};

class STEPBuilder
{
  constructor(typeName, schema)
  {
    this.index = 0;
    if (typeName === "Array")
    {
      this.entity = [];
    }
    else
    {
      let cls = schema ? schema[typeName] : HEADER_SCHEMA[typeName];
      if (cls)
      {
        this.entity = new cls();
        this.properties = Object.getOwnPropertyNames(this.entity)
          .filter(property => !property.startsWith("_"));
      }
      else
      {
        this.entity = null;
        console.warn("Unsupported entity " + typeName);
      }
    }
  }

  add(element)
  {
    let entity = this.entity;
    if (entity instanceof Array)
    {
      entity.push(element);
    }
    else if (entity !== null)
    {
      entity[this.properties[this.index]] = element;
    }
    this.index++;
  }
}

class STEPReference
{
  constructor(builder, tag)
  {
    this.entity = builder.entity;
    this.index = builder.index;
    this.tag = tag; // number
    this.property = builder.properties ?
      builder.properties[builder.index] : null;
  }
}

class STEPWriter
{
  constructor()
  {
    this.schemaName = "";
    this.constantClass = null;
    this.undefinedValue = undefined;
    this.entityTags = new Map();
    this.entities = [];
    this.tagCount = 0;
    this.output = "";
  }

  createEntityTag(entity) // called once per entity
  {
    return ++this.tagCount;
  }

  addEntities(object)
  {
    if (object instanceof Array)
    {
      const array = object;
      for (let item of array)
      {
        this.addEntities(item);
      }
    }
    else if (object instanceof Object && object.constructor.isEntity)
    {
      const entity = object;
      let tag = this.entityTags.get(entity);
      if (tag === undefined)
      {
        tag = this.createEntityTag(entity);
        this.entityTags.set(entity, tag);
        this.entities.push(entity);
        const attributes = this.getAttributeNames(entity);
        for (let attribute of attributes)
        {
          let value = entity[attribute];
          this.addEntities(value);
        }
      }
    }
  }

  write()
  {
    this.output = "";

    this.writeHeader();
    this.writeData();
    this.writeFooter();

    return this.output;
  }

  writeHeader()
  {
    this.output += `ISO-10303-21;
HEADER;

FILE_DESCRIPTION(('step'),'2;1');
FILE_NAME('step','',(''),(''),'Step','','');
FILE_SCHEMA(('${this.schemaName}'));
ENDSEC;

`;
  }

  writeData()
  {
    this.output += "DATA;\n";
    for (let entity of this.entities)
    {
      let tag = this.entityTags.get(entity);
      this.output += "#" + tag + "= ";
      this.writeObject(entity);
      this.output += ";\n";
    }
    this.output += "ENDSEC;\n";
  }

  writeFooter()
  {
    this.output += "END-ISO-10303-21;\n";
  }

  writeObject(object)
  {
    if (object === null)
    {
      this.output += "$";
    }
    else if (object === this.undefinedValue || object === undefined)
    {
      this.output += "*";
    }
    else if (object instanceof Array)
    {
      const array = object;
      this.output += "(";
      for (let i = 0; i < array.length; i++)
      {
        if (i > 0) this.output += ",";
        this.writeObjectWithTag(array[i]);
      }
      this.output += ")";
    }
    else if (typeof object === "boolean")
    {
      this.output += object ? ".T." : ".F.";
    }
    else if (typeof object === "string")
    {
      this.output += "'" + this.encodeSTEPString(object) + "'";
    }
    else if (typeof object === "number")
    {
      this.output += object;
    }
    else if (this.constantClass && (object instanceof this.constantClass))
    {
      this.output += "." + object.value + ".";
    }
    else if (typeof object === "object")
    {
      const className = object.constructor.name.toUpperCase();
      this.output += className + "(";

      if (object.constructor.isEntity)
      {
        const entity = object;
        const attributes = this.getAttributeNames(entity);
        for (let i = 0; i < attributes.length; i++)
        {
          if (i > 0) this.output += ",";
          let attribute = attributes[i];
          let value = entity[attribute];
          this.writeObjectWithTag(value);
        }
      }
      else // DefinedType
      {
        this.writeObject(object.Value);
      }
      this.output += ")";
    }
  }

  writeObjectWithTag(object)
  {
    let tag = this.entityTags.get(object);
    if (tag)
    {
      this.output += "#" + tag;
    }
    else
    {
      this.writeObject(object);
    }
  }

  encodeSTEPString(text)
  {
    let encoded = "";
    for (let i = 0; i < text.length; i++)
    {
      let ch = text[i];
      if (ch === "'") encoded += "''";
      else encoded += ch;
    }
    return encoded;
  }

  getAttributeNames(entity)
  {
    return Object.getOwnPropertyNames(entity)
          .filter(name => !name.startsWith("_"));
  }
}

/* STEP header elements */

class FILE_NAME
{
  Name = null;
  TimeStamp = null;
  Author = null;
  Organization = null;
  PreprocessorVersion = null;
  Authorization = null;
  Other = null;
};

class FILE_DESCRIPTION
{
  Description = null;
  ImplementationLevel = null;
};

class FILE_SCHEMA
{
  Schemas = null;
};

const HEADER_SCHEMA = {
  FILE_DESCRIPTION : FILE_DESCRIPTION,
  FILE_NAME : FILE_NAME,
  FILE_SCHEMA : FILE_SCHEMA
};

export { HEADER_SCHEMA, STEPParser, STEPWriter };
