
/**
* @author realor
*/
BIMROCKET.STEP = {};

BIMROCKET.STEP.File = class
{
  name = null;
  description = null;
  schema = null; // schema definition

  tags = {};
  references = [];
};

BIMROCKET.STEP.Parser = class
{
  schema = null; // classes map
  getSchemaTypes = null; // called to get schema types
  onEntityCreated = null; // called each time an entity is created
    
  decodeSTEPString(str)
  {
    return str.replace(/\\X2\\[\dA-F]{4}\\X0\\|\\X\\[\dA-F]{2}/gi,
      function (match)
      {
        var code = match.length === 12 ? 
          match.substring(4, 8) : match.substring(3, 5);
        return String.fromCharCode(parseInt(code, 16));
      });
  }

  parse(text)
  {
    const t0 = Date.now();
    const file = new BIMROCKET.STEP.File();
    const STEP = BIMROCKET.STEP.schema;
    let tags = file.tags;
    let references = file.references;
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
          let schema = tag ? this.schema : STEP;
          let newBuilder = new BIMROCKET.STEP.Builder(typeName, schema);

          if (builder) // previous builder
          {
            stack.push(builder); // save previous builder
            builder.add(newBuilder.instance);
          }
          builder = newBuilder;
          token = "";
        }
        else if (ch === ',' || ch === ')')
        {
          if (builder === null)
          {
            console.warn("Parsing error: " + stepString);
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
            else if (token.charAt(0) === '#')
            {
              if (builder.instance)
              {
                references.push(new BIMROCKET.STEP.Reference(builder, token));
              }
              builder.add(null);
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
          lineCount++;
          if (tag)
          {
            if (builder && builder.instance)
            {
              tags[tag] = builder.instance;
              if (this.onEntityCreated)
              {
                this.onEntityCreated(builder.instance);
              }
            }
          }
          else // process header elements
          {
            if (builder)
            {
              let instance = builder.instance;
              if (instance instanceof STEP.FILE_SCHEMA)
              {
                file.schema = instance;
                let schemaName = file.schema.Schemas[0];
                if (file.getSchemaTypes)
                {
                  this.schema = this.getSchemaTypes(schemaName);
                }
              }
              else if (instance instanceof STEP.FILE_NAME)
              {
                file.name = instance;
              }
              else if (instance instanceof STEP.FILE_DESCRIPTION)
              {
                file.description = instance;
              }              
            }
          }
          token = "";
          tag = null;
          builder = null;
        }
        else if (ch === '\n' || ch === '\r' || ch === '\t')
        {
          // ignore
        }
        else if (ch === '=')
        {
          token = token.trim();
          if (token.indexOf("#") === 0)
          {
            tag = token.trim();
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
      let instance = reference.instance;
      let referencedInstance = tags[reference.tag] || null;
      if (reference.property)
      {
        instance[reference.property] = referencedInstance;      
      }
      else // Array
      {
        let index = reference.index;
        instance[index] = referencedInstance;
      }
    }
    const t1 = Date.now();
    console.info("STEP File parsed in " + (t1 - t0) + " millis.");        
    console.info("File contains " + lineCount + " lines.");    

    return file;
  }
};

BIMROCKET.STEP.Builder = class
{
  constructor(typeName, schema)
  {
    this.index = 0;
    if (typeName === "Array")
    {
      this.instance = [];
    }
    else
    {
      let cls = schema ? schema[typeName] : BIMROCKET.STEP.schema[typeName];
      if (cls)
      {
        this.instance = new cls();
        this.properties = Object.getOwnPropertyNames(this.instance);
      }
      else
      {
        this.instance = null;
        console.warn("Unsupported entity " + typeName);
      }          
    }
  }

  add(element)
  {
    var instance = this.instance;
    if (instance instanceof Array)
    {
      instance.push(element);
    }
    else if (instance !== null)
    {
      instance[this.properties[this.index]] = element;
    }
    this.index++;
  }
};

BIMROCKET.STEP.Reference = class
{
  constructor(builder, tag)
  {
    this.instance = builder.instance;
    this.index = builder.index;
    this.tag = tag; // #<number>
    this.property = builder.properties ? 
      builder.properties[builder.index] : null;
  }
};

(function() {
let STEP = BIMROCKET.STEP.schema = {};

STEP.BASE = class
{
};

STEP.FILE_DESCRIPTION = class extends STEP.BASE
{
  Description = null;
  ImplementationLevel = null;
};

STEP.FILE_NAME = class extends STEP.BASE
{
  Name = null;
  TimeStamp = null;
  Author = null;
  Organization = null;
  PreprocessorVersion = null;
  Authorization = null;
  Other = null;
};

STEP.FILE_SCHEMA = class extends STEP.BASE
{
  Schemas = null;
};

})();

