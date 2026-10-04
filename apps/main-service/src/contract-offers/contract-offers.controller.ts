import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ContractOffersService, CreateContractOfferDto, UpdateContractOfferDto } from './contract-offers.service';

@Controller('contract-offers')
export class ContractOffersController {
  constructor(private readonly contractOffersService: ContractOffersService) {}

  @Get('counts')
  countByContract() {
    return this.contractOffersService.countByContract();
  }

  @Get()
  findByContract(@Query('contract_id') contractId: string) {
    return this.contractOffersService.findByContract(contractId);
  }

  @Post()
  create(@Body() dto: CreateContractOfferDto) {
    return this.contractOffersService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractOfferDto) {
    return this.contractOffersService.update(id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.contractOffersService.delete(id);
  }
}
