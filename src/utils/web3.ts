import { ethers } from 'ethers';

export const web3Util = {
  /**
   * EIP-191 규격의 메시지 서명 검증
   * @param message 서명할 메시지
   * @param signature 서명 데이터
   * @returns 서명한 지갑 주소
   */
  verifySignature(message: string, signature: string): string | null {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase();
    } catch (err) {
      console.error('Signature verification failed:', err);
      return null;
    }
  },

  /**
   * EIP-191 규격의 메시지 해시 생성
   * @param message 메시지
   * @returns 해시된 메시지
   */
  hashMessage(message: string): string {
    return ethers.hashMessage(message);
  },

  /**
   * 지갑 주소 유효성 검사
   * @param address 지갑 주소
   * @returns 유효 여부
   */
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch (err) {
      return false;
    }
  },

  /**
   * 지갑 주소 정규화
   * @param address 지갑 주소
   * @returns 체크섬이 포함된 정규화된 주소
   */
  normalizeAddress(address: string): string | null {
    try {
      return ethers.getAddress(address);
    } catch (err) {
      return null;
    }
  },
};
