import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.provider';
import { ContractOfferEntity } from './contract-offer.entity';
import { BillType } from '../bills/bill.entity';
import { ContractData, ContractOfferStatus } from '@xpensive/types';
import { ContractsService } from '../contracts/contracts.service';

export interface CreateContractOfferDto {
  contract_id: string;
  provider_id: string;
  bill_type: BillType;
  monthly_price: number;
  received_date: string;
  status?: ContractOfferStatus;
  comment?: string | null;
  data: ContractData;
}

export interface UpdateContractOfferDto {
  provider_id?: string;
  bill_type?: BillType;
  monthly_price?: number;
  received_date?: string;
  status?: ContractOfferStatus;
  comment?: string | null;
  data?: ContractData;
  /** Required when transitioning status to "accepted" — becomes the start_date of the new contract. */
  effective_date?: string;
  /** Optional, only used when transitioning status to "accepted" — becomes the end_date of the new contract. */
  new_contract_end_date?: string | null;
}

@Injectable()
export class ContractOffersService {
  private readonly logger = new Logger(ContractOffersService.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly contractsService: ContractsService,
  ) {}

  async findByContract(contractId: string): Promise<ContractOfferEntity[]> {
    this.logger.log(`Fetching contract offers for contract_id="${contractId}"`);
    const result = await this.pool.query<ContractOfferEntity>(
      'SELECT * FROM contract_offers WHERE contract_id = $1 AND state = 0 ORDER BY received_date DESC',
      [contractId],
    );
    return result.rows;
  }

  async countByContract(): Promise<{ contract_id: string; count: number }[]> {
    this.logger.log('Fetching contract offer counts grouped by contract');
    const result = await this.pool.query<{ contract_id: string; count: string }>(
      'SELECT contract_id, COUNT(*) AS count FROM contract_offers WHERE state = 0 GROUP BY contract_id',
    );
    return result.rows.map((row) => ({ contract_id: row.contract_id, count: Number(row.count) }));
  }

  async create(dto: CreateContractOfferDto): Promise<ContractOfferEntity> {
    this.logger.log(`Creating contract offer for contract_id="${dto.contract_id}"`);
    const result = await this.pool.query<ContractOfferEntity>(
      `INSERT INTO contract_offers (contract_id, provider_id, bill_type, monthly_price, received_date, status, comment, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.contract_id,
        dto.provider_id,
        dto.bill_type,
        dto.monthly_price,
        dto.received_date,
        dto.status ?? 'pending',
        dto.comment ?? null,
        JSON.stringify(dto.data),
      ],
    );
    return result.rows[0];
  }

  async update(id: string, dto: UpdateContractOfferDto): Promise<ContractOfferEntity> {
    this.logger.log(`Updating contract offer id="${id}"`);
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.provider_id !== undefined)   { fields.push(`provider_id = $${idx++}`);   values.push(dto.provider_id); }
    if (dto.bill_type !== undefined)     { fields.push(`bill_type = $${idx++}`);     values.push(dto.bill_type); }
    if (dto.monthly_price !== undefined) { fields.push(`monthly_price = $${idx++}`); values.push(dto.monthly_price); }
    if (dto.received_date !== undefined) { fields.push(`received_date = $${idx++}`); values.push(dto.received_date); }
    if (dto.status !== undefined)        { fields.push(`status = $${idx++}`);        values.push(dto.status); }
    if (dto.comment !== undefined)       { fields.push(`comment = $${idx++}`);        values.push(dto.comment); }
    if (dto.data !== undefined)          { fields.push(`data = $${idx++}`);           values.push(JSON.stringify(dto.data)); }

    values.push(id);
    const result = await this.pool.query<ContractOfferEntity>(
      `UPDATE contract_offers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    const offer = result.rows[0];

    if (dto.status === 'accepted') {
      if (!dto.effective_date) {
        throw new BadRequestException('effective_date is required to accept a contract offer');
      }

      const previousContract = await this.contractsService.findOne(offer.contract_id);
      if (!previousContract) {
        throw new BadRequestException(`Contract id="${offer.contract_id}" not found`);
      }

      await this.contractsService.closeOutBefore(offer.contract_id, dto.effective_date);
      await this.contractsService.create({
        bill_type: offer.bill_type,
        provider_id: offer.provider_id,
        residence_id: previousContract.residence_id,
        resident_id: previousContract.resident_id,
        monthly_price: offer.monthly_price,
        start_date: dto.effective_date,
        end_date: dto.new_contract_end_date ?? null,
        comment: previousContract.comment,
        data: offer.data,
      });
    }

    return offer;
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting contract offer id="${id}"`);
    await this.pool.query('UPDATE contract_offers SET state = 1 WHERE id = $1', [id]);
  }
}
