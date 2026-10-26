import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ActivityInterceptor } from "../../../mandates/infrastructure/http/activity.interceptor";
import { CurrentMandate } from "../../../mandates/infrastructure/http/current-mandate.decorator";
import { MandateAction } from "../../../mandates/infrastructure/http/mandate-action.decorator";
import { type MandateAuth, MandateKeyGuard } from "../../../mandates/infrastructure/http/mandate-key.guard";
import { GetProductQuery } from "../../application/get-product.handler";
import type { ProductView, SearchResultView } from "../../application/product-view";
import { SearchCatalogQuery } from "../../application/search-catalog.handler";
import { ProductResponse, SearchCatalogParams, SearchResultResponse } from "./catalog.dto";

@ApiTags("agent")
@ApiBearerAuth("mandateKey")
@Controller("v1/catalog")
@UseGuards(MandateKeyGuard)
@UseInterceptors(ActivityInterceptor)
export class CatalogController {
  constructor(private readonly queries: QueryBus) {}

  @Get("search")
  @MandateAction("search")
  @ApiOperation({ operationId: "searchCatalog" })
  @ApiOkResponse({ type: SearchResultResponse, isArray: true })
  search(@CurrentMandate() auth: MandateAuth, @Query() params: SearchCatalogParams): Promise<SearchResultView[]> {
    return this.queries.execute<SearchCatalogQuery, SearchResultView[]>(
      new SearchCatalogQuery(auth.mandateId, params.q, params.category, params.limit),
    );
  }

  @Get("products/:productId")
  @MandateAction("view_product")
  @ApiOperation({ operationId: "getProduct" })
  @ApiOkResponse({ type: ProductResponse })
  getProduct(@Param("productId", new ParseUUIDPipe()) productId: string): Promise<ProductView> {
    return this.queries.execute<GetProductQuery, ProductView>(new GetProductQuery(productId));
  }
}
