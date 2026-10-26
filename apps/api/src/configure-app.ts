import {
  BadRequestException,
  type INestApplication,
  ValidationPipe,
  type ValidationError,
} from "@nestjs/common";
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { Logger, PinoLogger } from "nestjs-pino";
import { CorrelationMiddleware } from "./shared/correlation/correlation.middleware";
import { HttpErrorFilter } from "./shared/http/error.filter";

function flattenFieldErrors(errors: ValidationError[], prefix = ""): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((acc, error) => {
    const field = prefix ? `${prefix}.${error.property}` : error.property;
    const own = error.constraints ? { [field]: Object.values(error.constraints) } : {};
    return { ...acc, ...own, ...flattenFieldErrors(error.children ?? [], field) };
  }, {});
}

/** Everything the API needs on top of its modules. Shared by main, tests and the OpenAPI export. */
export async function configureApp(app: INestApplication): Promise<OpenAPIObject> {
  const correlation = new CorrelationMiddleware();
  // Registered first so the logger and every handler see the correlation id.
  app.use(correlation.use.bind(correlation));
  app.use(cookieParser());
  app.useLogger(app.get(Logger));

  const filterLogger = await app.resolve(PinoLogger);
  filterLogger.setContext("HttpErrorFilter");
  app.useGlobalFilters(new HttpErrorFilter(filterLogger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({ message: "Validation failed", fieldErrors: flattenFieldErrors(errors) }),
    }),
  );

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Agentic Market API")
      .setVersion("1.0.0")
      .addCookieAuth("am_session")
      .addBearerAuth({ type: "http", scheme: "bearer", description: "Mandate access key (amk_...)" }, "mandateKey")
      .build(),
  );
  // API documentation is public (constitution 1.1.0 exemption).
  SwaggerModule.setup("docs", app, document, { jsonDocumentUrl: "openapi.json" });
  return document;
}
