import { Controller, Get, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import { UserAuthGuard } from "../../../identity/infrastructure/http/user-auth.guard";
import { type CategoryView, ListCategoriesQuery } from "../../application/list-categories.handler";

class CategoryResponse implements CategoryView {
  @ApiProperty()
  slug!: string;
  @ApiProperty()
  name!: string;
}

// Mandate-key access to this route is added with the key guard (slice 3b).
@ApiTags("user", "agent")
@Controller("v1/categories")
@UseGuards(UserAuthGuard)
export class CategoriesController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ operationId: "listCategories" })
  @ApiOkResponse({ type: CategoryResponse, isArray: true })
  list(): Promise<CategoryView[]> {
    return this.queries.execute<ListCategoriesQuery, CategoryView[]>(new ListCategoriesQuery());
  }
}
