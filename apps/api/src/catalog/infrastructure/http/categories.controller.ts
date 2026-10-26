import { Controller, Get, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import { UserOrKeyGuard } from "../../../mandates/infrastructure/http/user-or-key.guard";
import { type CategoryView, ListCategoriesQuery } from "../../application/list-categories.handler";

class CategoryResponse implements CategoryView {
  @ApiProperty()
  slug!: string;
  @ApiProperty()
  name!: string;
}

@ApiTags("user", "agent")
@Controller("v1/categories")
@UseGuards(UserOrKeyGuard)
export class CategoriesController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @ApiCookieAuth()
  @ApiBearerAuth("mandateKey")
  @ApiOperation({ operationId: "listCategories" })
  @ApiOkResponse({ type: CategoryResponse, isArray: true })
  list(): Promise<CategoryView[]> {
    return this.queries.execute<ListCategoriesQuery, CategoryView[]>(new ListCategoriesQuery());
  }
}
