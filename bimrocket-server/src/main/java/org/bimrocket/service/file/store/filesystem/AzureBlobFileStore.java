package org.bimrocket.service.file.store.filesystem;

import com.azure.core.http.rest.PagedIterable;
import com.azure.core.util.BinaryData;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.models.BlobItem;
import com.azure.storage.blob.models.BlobProperties;
import com.azure.storage.blob.models.ListBlobsOptions;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import jakarta.annotation.PostConstruct;
import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.service.file.*;
import org.bimrocket.service.file.store.FileStore;
import org.bimrocket.service.file.util.MutableACL;
import org.bimrocket.service.file.util.MutableACLDeserializer;
import org.bimrocket.service.file.util.MutableACLSerializer;
import org.bimrocket.service.file.util.MutableMetadata;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class AzureBlobFileStore implements FileStore
{
  static final String BASE = "services.file.store.azure.";

  private BlobContainerClient containerClient;

  private static final String ACL_FILENAME = ".acl";
  private static final String FOLDER_MARKER = ".folder";

  @PostConstruct
  public void init()
  {
    try
    {
      Config config = ConfigProvider.getConfig();
      String connectionString = config.getValue(BASE + "connection-string", String.class);
      String containerName = config.getValue(BASE + "container-name", String.class);

      BlobServiceClient serviceClient = new BlobServiceClientBuilder()
               .connectionString(connectionString)
               .buildClient();

      containerClient = serviceClient.getBlobContainerClient(containerName);

      if (!containerClient.exists())
      {
        containerClient.create();
      }
    }
    catch (Exception e)
    {
      throw new RuntimeException("Failed to initialize AzureBlobFileStore", e);
    }
  }

  @Override
  public List<Metadata> find(Path path, FindOptions options)
  {
    String prefix = normalizePath(path); // without initial "/"
    boolean isRoot = prefix.isEmpty();

    if (!isRoot && !prefix.endsWith("/"))
    {
      prefix += "/";
    }

    List<Metadata> metadatas = new ArrayList<>();

    // Includes required root (if not is root of the container)
    if (options.isIncludeRoot() && !isRoot)
    {
      Metadata rootMd = getMetadata(stripTrailingSlash(prefix));
      if (rootMd != null) metadatas.add(rootMd);
    }

    if (options.getDepth() > 0)
    {
      PagedIterable<BlobItem> blobs =
              containerClient.listBlobsByHierarchy("/", new ListBlobsOptions().setPrefix(prefix), null);

      for (BlobItem item : blobs)
      {
        String name = item.getName(); // p.ex. "reports/.folder" o "reports/file.txt"

        if (name.endsWith("/" + ACL_FILENAME))
        {
          // Hidde ACL
          continue;
        }

        if (name.endsWith("/" + FOLDER_MARKER))
        {
          // Do not expose .folder; exposes parent folder
          String dir = name.substring(0, name.length() - ("/" + FOLDER_MARKER).length());
          Metadata md = getMetadata(dir);
          if (md != null) metadatas.add(md);
          continue;
        }

        Metadata md = getMetadata(name);
        if (md != null) metadatas.add(md);
      }
    }

    return metadatas;
  }

  @Override
  public Metadata get(Path path)
  {
    String blobName = normalizePath(path);

    // Container root: deal like a collection
    if (blobName.isEmpty())
    {
      MutableMetadata metadata = new MutableMetadata();
      metadata.setPath(new Path("/"));
      metadata.setCollection(true);
      metadata.setContentLength(0);
      long now = System.currentTimeMillis();
      metadata.setCreationDate(now);
      metadata.setLastModifiedDate(now);
      metadata.setContentType(null);
      return metadata;
    }

    BlobClient blobClient = containerClient.getBlobClient(blobName);

    if (blobClient.exists())
    {
      // Real File
      BlobProperties properties = blobClient.getProperties();
      MutableMetadata metadata = new MutableMetadata();
      metadata.setPath(new Path("/" + blobName));
      metadata.setCollection(false);
      metadata.setContentLength(properties.getBlobSize());
      metadata.setCreationDate(properties.getCreationTime().toInstant().toEpochMilli());
      metadata.setLastModifiedDate(properties.getLastModified().toInstant().toEpochMilli());
      metadata.setContentType(resolveContentType(getName(blobName), properties.getContentType()));
      return metadata;
    }

    // If not exist like a file, could be a virtual folder?
    // 1) There is .folder marker?
    BlobClient marker = containerClient.getBlobClient(blobName + "/" + FOLDER_MARKER);
    boolean folderByMarker = marker.exists();

    // 2) Or it have sons with prefix?
    boolean folderByChildren = false;
    if (!folderByMarker)
    {
      PagedIterable<BlobItem> children =
          containerClient.listBlobsByHierarchy("/", new ListBlobsOptions().setPrefix(blobName + "/"), null);
     folderByChildren = children.iterator().hasNext();
    }

    if (folderByMarker || folderByChildren)
    {
      MutableMetadata metadata = new MutableMetadata();
      metadata.setPath(new Path("/" + blobName));
      metadata.setCollection(true);
      metadata.setContentLength(0);

      long now = System.currentTimeMillis();
      if (folderByMarker)
      {
        try
        {
          BlobProperties mp = marker.getProperties();
          metadata.setCreationDate(mp.getCreationTime().toInstant().toEpochMilli());
          metadata.setLastModifiedDate(mp.getLastModified().toInstant().toEpochMilli());
        }
        catch (Exception e)
        {
          metadata.setCreationDate(now);
          metadata.setLastModifiedDate(now);
        }
      }
      else
      {
        metadata.setCreationDate(now);
        metadata.setLastModifiedDate(now);
      }
      metadata.setContentType(null);
      return metadata;
    }

    throw new NotFoundException("Blob not found: " + blobName);
  }

  @Override
  public Metadata makeCollection(Path path)
  {
    String folderBlobName = normalizePath(path);

    // Ensure final "/"
    if (!folderBlobName.endsWith("/")) folderBlobName += "/";
    // internal marker
    String markerBlobName = folderBlobName + FOLDER_MARKER;

    BlobClient blobClient = containerClient.getBlobClient(markerBlobName);
    if (blobClient.exists())
    {
      throw new InvalidRequestException("Folder already exists");
    }

    blobClient.upload(new ByteArrayInputStream(new byte[0]), 0);

    MutableMetadata metadata = new MutableMetadata();
    metadata.setPath(new Path("/" + stripTrailingSlash(folderBlobName)));
    metadata.setCollection(true);
    metadata.setContentLength(0);
    long now = System.currentTimeMillis();
    metadata.setCreationDate(now);
    metadata.setLastModifiedDate(now);
    metadata.setContentType(null);

    return metadata;
  }

  @Override
  public InputStream read(Path path) throws IOException
  {
    String blobPath = normalizePath(path);

    if (blobPath.endsWith("/") || !(isValidFile(blobPath) || isACLFile(blobPath)))
    {
      throw new InvalidRequestException("Invalid path");
    }

    BlobClient blobClient = containerClient.getBlobClient(blobPath);

    if (!blobClient.exists())
    {
      throw new NotFoundException("Blob not found");
    }

    try
    {
      return blobClient.openInputStream();
    }
    catch (Exception e)
    {
      throw new IOException("Failed to open blob input stream", e);
    }
  }

  @Override
  public Metadata write(Path path, InputStream is, String contentType) throws IOException
  {
    String blobPath = normalizePath(path);

    if (blobPath.endsWith("/") || !(isValidFile(blobPath) || isACLFile(blobPath)))
    {
      throw new InvalidRequestException("Invalid path: " + blobPath);
    }

    // Ensure marker of the parent folder
    ensureParentFolder(blobPath);

    BlobClient blobClient = containerClient.getBlobClient(blobPath);

    try
    {
      BinaryData data = BinaryData.fromStream(is);
      blobClient.upload(data, true);
      String finalCt = (contentType == null || contentType.isBlank())
              ? resolveContentType(getName(blobPath), null)
              : contentType;
      blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(finalCt));
    }
    finally
    {
      is.close();
    }

    return getMetadata(blobPath);
  }

  @Override
  public void delete(Path path)
  {
    String blobPath = normalizePath(path);
    BlobClient blobClient = containerClient.getBlobClient(blobPath);

    if (blobClient.exists())
    {
      blobClient.delete();
      return;
    }

    String prefix = blobPath.endsWith("/") ? blobPath : blobPath + "/";
    PagedIterable<BlobItem> children =
            containerClient.listBlobsByHierarchy("/", new ListBlobsOptions().setPrefix(prefix), null);

    List<BlobItem> childList = new ArrayList<>();
    for (BlobItem item : children) childList.add(item);

    if (childList.size() == 1 && isACLFileName(childList.get(0).getName()))
    {
      containerClient.getBlobClient(childList.get(0).getName()).delete();
    }

    for (BlobItem item : childList)
    {
      containerClient.getBlobClient(item.getName()).delete();
    }
  }

  @Override
  public Map<String, Object> getProperties(Path path, String... names)
  {
    return null;
  }

  @Override
  public void setProperties(Path path, Map<String, Object> properties)
  {
  }

  @Override
  public ACL getACL(Path path)
  {
    String aclBlobPath = getACLBlobPath(path);
    BlobClient blobClient = containerClient.getBlobClient(aclBlobPath);

    if (!blobClient.exists()) return null;

    try (InputStream is = blobClient.openInputStream())
    {
      ObjectMapper mapper = new ObjectMapper();
      SimpleModule module = new SimpleModule();
      module.addDeserializer(MutableACL.class, new MutableACLDeserializer());
      mapper.registerModule(module);

      ACLFile.FileMap fileMap = mapper.readValue(is, ACLFile.FileMap.class);

      String filename = isDirectoryPath(path)
              ? ACLFile.ANY_FILENAME
              : path.getName();

      return fileMap.get(filename);
    }
    catch (IOException e)
    {
      throw new RuntimeException("Failed to read ACL blob: " + aclBlobPath, e);
    }
  }

  @Override
  public void setACL(Path path, ACL acl)
  {
    String aclBlobPath = getACLBlobPath(path);
    BlobClient blobClient = containerClient.getBlobClient(aclBlobPath);

    String filename = isDirectoryPath(path)
            ? ACLFile.ANY_FILENAME
            : path.getName();

    // Read current ACL if found
    ACLFile.FileMap fileMap = new ACLFile.FileMap();

    if (blobClient.exists())
    {
      try (InputStream is = blobClient.openInputStream())
      {
        ObjectMapper mapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
        module.addDeserializer(MutableACL.class, new MutableACLDeserializer());
        mapper.registerModule(module);

        fileMap = mapper.readValue(is, ACLFile.FileMap.class);
      }
      catch (Exception e)
      {
        throw new RuntimeException("Failed to read existing ACL blob: " + aclBlobPath, e);
      }
    }

    MutableACL mutAcl = new MutableACL();
    mutAcl.copy(acl);
    fileMap.put(filename, mutAcl);

    // Save ACL
    try (ByteArrayOutputStream baos = new ByteArrayOutputStream())
    {
      ObjectMapper mapper = new ObjectMapper();
      SimpleModule module = new SimpleModule();
      module.addSerializer(MutableACL.class, new MutableACLSerializer());
      mapper.registerModule(module);

      mapper.writeValue(baos, fileMap);
      byte[] content = baos.toByteArray();

      try (ByteArrayInputStream bais = new ByteArrayInputStream(content))
      {
        blobClient.upload(bais, content.length, true);
      }
    }
    catch (IOException e)
    {
      throw new RuntimeException("Failed to write ACL blob: " + aclBlobPath, e);
    }
  }


  private String getACLBlobPath(Path path)
  {
    String blobPath = normalizePath(path);

    if (isDirectoryPath(path))
    {
      if (!blobPath.isEmpty() && !blobPath.endsWith("/")) blobPath += "/";
      return blobPath + ACL_FILENAME;
    }

    int idx = blobPath.lastIndexOf('/');
    if (idx < 0)
    {
      return ACL_FILENAME;
    }

    String parent = blobPath.substring(0, idx);
    return parent + "/" + ACL_FILENAME;
  }

  @Override
  public Lock getLock(Path path) { return null; }

  @Override
  public void setLock(Path path, Lock lock) {}

  @Override
  public void move(Path sourcePath, Path destPath) throws IOException
  {
    String sourceBlobPath = normalizePath(sourcePath);
    String destBlobPath = normalizePath(destPath);

    if (isACLFileName(sourceBlobPath) || isACLFileName(destBlobPath))
      throw new InvalidRequestException("Invalid path");

    BlobClient sourceClient = containerClient.getBlobClient(sourceBlobPath);
    BlobClient destClient   = containerClient.getBlobClient(destBlobPath);

    if (!sourceClient.exists())
      throw new NotFoundException("Source blob does not exist");

    // ensure target folder
    ensureParentFolder(destBlobPath);

    destClient.beginCopy(sourceClient.getBlobUrl(), null);
    sourceClient.delete();
  }

  @Override
  public void copy(Path sourcePath, Path destPath) throws IOException
  {
    String sourceBlobPath = normalizePath(sourcePath);
    String destBlobPath   = normalizePath(destPath);

    if (isACLFileName(sourceBlobPath) || isACLFileName(destBlobPath))
      throw new InvalidRequestException("Invalid path");

    BlobClient sourceClient = containerClient.getBlobClient(sourceBlobPath);
    BlobClient destClient   = containerClient.getBlobClient(destBlobPath);

    if (!sourceClient.exists())
      throw new NotFoundException("Source blob not found");

    if (destBlobPath.endsWith("/"))
    {
      String fileName = sourceBlobPath.substring(sourceBlobPath.lastIndexOf("/") + 1);
      destBlobPath = destBlobPath + fileName;
      destClient   = containerClient.getBlobClient(destBlobPath);
      if (destClient.exists())
        throw new InvalidRequestException("File already exists at destination");
      }

      // ensure target folder
      ensureParentFolder(destBlobPath);

      destClient.beginCopy(sourceClient.getBlobUrl(), null);
  }

  /* Helpers */

  private String normalizePath(Path path)
  {
    String p = path.toString();
    if (p.startsWith("/")) p = p.substring(1);
    return p.trim();
  }

  private static String stripTrailingSlash(String s)
  {
    return (s != null && s.endsWith("/")) ? s.substring(0, s.length() - 1) : s;
  }

  private void ensureParentFolder(String blobPath)
  {
    int idx = blobPath.lastIndexOf('/');
    if (idx > 0)
    {
      String parent = blobPath.substring(0, idx);
      String marker = parent + "/" + FOLDER_MARKER;
      BlobClient folderClient = containerClient.getBlobClient(marker);
      if (!folderClient.exists())
      {
        folderClient.upload(new ByteArrayInputStream(new byte[0]), 0);
      }
      }
  }

  private Metadata getMetadata(String blobName)
  {
    if (blobName == null || blobName.isBlank()) return null;

    if (isACLFileName(blobName) || isFolderMarker(blobName))
      return null; // do not expose directly markers and ACL

    boolean isFolder = blobName.endsWith("/");

    // Also folder with markers or sons
    if (!isFolder)
    {
      BlobClient marker = containerClient.getBlobClient(blobName + "/" + FOLDER_MARKER);
      if (marker.exists())
      {
        isFolder = true;
      }
      else
      {
        PagedIterable<BlobItem> children =
          containerClient.listBlobsByHierarchy("/", new ListBlobsOptions().setPrefix(blobName + "/"), null);
        isFolder = children.iterator().hasNext();
      }
    }

    // Path exposed, without duplicity and final "/"
    String display = "/" + stripTrailingSlash(blobName);

    MutableMetadata metadata = new MutableMetadata();
    metadata.setPath(new Path(display));
    metadata.setCollection(isFolder);

    if (isFolder)
    {
      metadata.setContentLength(0);
      metadata.setContentType(null);

      // Dates: if we have markers, use ourselves; else, now
      long now = System.currentTimeMillis();
      try
      {
        BlobClient marker = containerClient.getBlobClient(stripTrailingSlash(blobName) + "/" + FOLDER_MARKER);
        if (marker.exists())
        {
          BlobProperties mp = marker.getProperties();
          metadata.setCreationDate(mp.getCreationTime().toInstant().toEpochMilli());
          metadata.setLastModifiedDate(mp.getLastModified().toInstant().toEpochMilli());
        }
        else
        {
          metadata.setCreationDate(now);
          metadata.setLastModifiedDate(now);
        }
      }
      catch (Exception e)
      {
        metadata.setCreationDate(now);
        metadata.setLastModifiedDate(now);
      }
    }
    else
    {
      BlobClient blobClient = containerClient.getBlobClient(blobName);
      if (blobClient.exists())
      {
        BlobProperties properties = blobClient.getProperties();
        metadata.setContentType(resolveContentType(getName(blobName), properties.getContentType()));
        metadata.setContentLength(properties.getBlobSize());
        metadata.setCreationDate(properties.getCreationTime().toInstant().toEpochMilli());
        metadata.setLastModifiedDate(properties.getLastModified().toInstant().toEpochMilli());
      }
      else
      {
        return null; // do not exist as a folder and as a file
      }
    }

    return metadata;
  }

  private String resolveContentType(String filename, String azureContentType)
  {
    if (azureContentType != null && !azureContentType.isBlank()) return azureContentType;

    String ext = "";
    int dot = filename.lastIndexOf('.');
    if (dot > 0) ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT);

    // Mapping IFC
    if ("ifc".equals(ext))     return "model/vnd.ifc";
    if ("ifcxml".equals(ext))  return "application/step+xml";
    if ("ifczip".equals(ext))  return "application/zip";

    // Scripts and used texts
    if ("js".equals(ext))  return "application/javascript";
    if ("mjs".equals(ext)) return "application/javascript";
    if ("ts".equals(ext))  return "text/plain";
    if ("py".equals(ext))  return "text/x-script.python";
    if ("sh".equals(ext))  return "text/x-shellscript";
    if ("bat".equals(ext)) return "text/x-batch";
    if ("ps1".equals(ext)) return "text/x-powershell";

    // Other commons
    if ("json".equals(ext)) return "application/json";
    if ("txt".equals(ext))  return "text/plain";
    if ("csv".equals(ext))  return "text/csv";
    if ("xml".equals(ext))  return "application/xml";
    if ("html".equals(ext)) return "text/html";
    if ("htm".equals(ext))  return "text/html";
    if ("zip".equals(ext))  return "application/zip";
    if ("pdf".equals(ext))  return "application/pdf";

    // Fallback there is not extension or unknown
    return "text/plain";
  }

  private boolean isValidFile(String blobPath)
  {
    String name = getName(blobPath);
    return !name.startsWith(".") && !name.equals(ACL_FILENAME);
  }

  private boolean isACLFile(String blobPath)
  {
    String name = getName(blobPath);
    return name.equals(ACL_FILENAME);
  }

  private boolean isACLFileName(String name)
  {
    return name != null && name.endsWith("/" + ACL_FILENAME);
  }

  private String getName(String blobPath)
  {
    int lastSlash = blobPath.lastIndexOf('/');
    return lastSlash >= 0 ? blobPath.substring(lastSlash + 1) : blobPath;
  }

  private boolean isDirectoryPath(Path path)
  {
    return path.toString().endsWith("/") || path.isRoot();
  }

  private boolean isFolderMarker(String blobName)
  {
    return blobName != null && blobName.endsWith("/" + FOLDER_MARKER);
  }
}
