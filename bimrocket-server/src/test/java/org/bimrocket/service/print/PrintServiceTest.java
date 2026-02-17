package org.bimrocket.service.print;

import org.bimrocket.api.print.PrintCommand;
import org.bimrocket.api.print.PrintSource;
import org.eclipse.microprofile.config.Config;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PrintServiceTest
{
  private Config config;
  private PrintService printService;

  @BeforeEach
  void setUp() throws Exception
  {
    config = mock(Config.class);
    printService = new PrintService();

    // Inject manualy Config mock
    var field = PrintService.class.getDeclaredField("config");
    field.setAccessible(true);
    field.set(printService, config);

    // Mock of base directory and configuration values
    when(config.getOptionalValue("services.print.directory", String.class))
      .thenReturn(java.util.Optional.of(System.getProperty("java.io.tmpdir")));
    when(config.getValue("services.print.title", String.class)).thenReturn("Default Title");
    when(config.getValue("services.print.creator", String.class)).thenReturn("Test Creator");

    // Initialize service (create baseDir)
    printService.init();
  }

  @Test
  void testPrintAndCopy() throws IOException
  {
    // Create PrintSource with commands
    PrintSource source = new PrintSource();
    source.setTitle("Test PDF");

    PrintCommand cmd1 = new PrintCommand();
    cmd1.setType("moveto");
    cmd1.setArguments(List.of(10f, 10f));

    PrintCommand cmd2 = new PrintCommand();
    cmd2.setType("lineto");
    cmd2.setArguments(List.of(100f, 100f));

    PrintCommand cmd3 = new PrintCommand();
    cmd3.setType("stroke");
    cmd3.setArguments(List.of());

    source.setCommands(List.of(cmd1, cmd2, cmd3));

    // Do print
    String printId = printService.print(source);
    assertNotNull(printId);

    File file = new File(System.getProperty("java.io.tmpdir"), "print-" + printId + ".pdf");
    assertTrue(file.exists(), "PDF file should be created");
    assertTrue(file.length() > 0, "PDF file must not be empty");

    // check the copy
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    printService.copy(printId, baos);
    assertTrue(baos.size() > 0, "Stream must have data");

    // Clean file after test
    file.delete();
  }

  @Test
  void testPrintUsesDefaultTitleWhenBlank() throws IOException
  {
    PrintSource source = new PrintSource();
    source.setTitle(""); // title in blanks

    PrintCommand cmd = new PrintCommand();
    cmd.setType("stroke");
    cmd.setArguments(List.of());
    source.setCommands(List.of(cmd));

    String printId = printService.print(source);
    assertNotNull(printId);

    File file = new File(System.getProperty("java.io.tmpdir"), "print-" + printId + ".pdf");
    assertTrue(file.exists());
    file.delete();
  }
}
