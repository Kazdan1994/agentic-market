import { Module } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { IdentityModule } from "../identity/identity.module";
import { MandatesModule } from "../mandates/mandates.module";
import { CHECKOUT_LOGGER, CheckoutHandler } from "./application/checkout.handler";
import { GetOrderHandler } from "./application/get-order.handler";
import { ListOrdersHandler } from "./application/list-orders.handler";
import { ORDER_READ_MODEL } from "./application/order-view";
import { CHECKOUT_UNIT_OF_WORK } from "./domain/checkout-unit-of-work.port";
import { PAYMENT_GATEWAY } from "./domain/payment-gateway.port";
import { CheckoutController } from "./infrastructure/http/checkout.controller";
import { OrdersController } from "./infrastructure/http/orders.controller";
import { SimulatedPaymentGateway } from "./infrastructure/simulated-payment-gateway";
import { TypeOrmCheckoutUnitOfWork } from "./infrastructure/typeorm-checkout-unit-of-work";
import { TypeOrmOrderReadModel } from "./infrastructure/typeorm-order-read-model";

@Module({
  imports: [IdentityModule, MandatesModule],
  controllers: [CheckoutController, OrdersController],
  providers: [
    CheckoutHandler,
    GetOrderHandler,
    ListOrdersHandler,
    { provide: CHECKOUT_UNIT_OF_WORK, useClass: TypeOrmCheckoutUnitOfWork },
    { provide: PAYMENT_GATEWAY, useClass: SimulatedPaymentGateway },
    { provide: ORDER_READ_MODEL, useClass: TypeOrmOrderReadModel },
    {
      provide: CHECKOUT_LOGGER,
      inject: [PinoLogger],
      useFactory: (logger: PinoLogger) => {
        logger.setContext("Checkout");
        return { info: (obj: object, msg: string) => logger.info(obj, msg) };
      },
    },
  ],
})
export class CheckoutModule {}
