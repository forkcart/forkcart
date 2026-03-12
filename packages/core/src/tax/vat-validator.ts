import { createLogger } from '../lib/logger';

const logger = createLogger('vat-validator');

/** Result from VIES VAT number validation */
export interface ViesValidationResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name?: string;
  address?: string;
  requestDate: string;
}

/**
 * Validates EU VAT IDs against the VIES (VAT Information Exchange System).
 * Uses the official EU SOAP service.
 * See: https://ec.europa.eu/taxation_customs/vies/
 */
export class VatValidator {
  private static readonly VIES_URL =
    'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';

  /** Parse a VAT ID into country code + number */
  static parseVatId(vatId: string): { countryCode: string; vatNumber: string } | null {
    const cleaned = vatId.replace(/[\s.-]/g, '').toUpperCase();
    const match = cleaned.match(/^([A-Z]{2})(\w+)$/);
    if (!match) return null;
    return { countryCode: match[1]!, vatNumber: match[2]! };
  }

  /** Validate an EU VAT ID via VIES SOAP API */
  async validate(vatId: string): Promise<ViesValidationResult> {
    const parsed = VatValidator.parseVatId(vatId);
    if (!parsed) {
      return {
        valid: false,
        countryCode: '',
        vatNumber: vatId,
        requestDate: new Date().toISOString().slice(0, 10),
      };
    }

    const { countryCode, vatNumber } = parsed;

    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                        xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <soapenv:Header/>
        <soapenv:Body>
          <urn:checkVat>
            <urn:countryCode>${countryCode}</urn:countryCode>
            <urn:vatNumber>${vatNumber}</urn:vatNumber>
          </urn:checkVat>
        </soapenv:Body>
      </soapenv:Envelope>
    `.trim();

    try {
      const response = await fetch(VatValidator.VIES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          SOAPAction: '',
        },
        body: soapBody,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'VIES service returned non-OK status');
        throw new Error(`VIES HTTP ${response.status}`);
      }

      const xml = await response.text();
      return this.parseViesResponse(xml, countryCode, vatNumber);
    } catch (error) {
      logger.error({ error, vatId }, 'VIES validation failed');
      // On VIES downtime, return unknown status rather than rejecting
      return {
        valid: false,
        countryCode,
        vatNumber,
        requestDate: new Date().toISOString().slice(0, 10),
      };
    }
  }

  private parseViesResponse(
    xml: string,
    countryCode: string,
    vatNumber: string,
  ): ViesValidationResult {
    const extractTag = (tag: string): string | undefined => {
      const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
      const match = xml.match(regex);
      return match?.[1]?.trim();
    };

    const valid = extractTag('valid') === 'true';
    const name = extractTag('name');
    const address = extractTag('address');
    const requestDate = extractTag('requestDate') ?? new Date().toISOString().slice(0, 10);

    return {
      valid,
      countryCode,
      vatNumber,
      name: name && name !== '---' ? name : undefined,
      address: address && address !== '---' ? address : undefined,
      requestDate,
    };
  }
}
