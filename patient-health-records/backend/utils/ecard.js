const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateEcardNumber() {
  let value = '';
  for (let index = 0; index < 7; index += 1) {
    value += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return value;
}

async function createUniqueEcardNumber(client) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const ecardNumber = generateEcardNumber();
    const existing = await client.query(
      'SELECT id FROM users WHERE ecard_number = $1',
      [ecardNumber]
    );

    if (existing.rows.length === 0) {
      return ecardNumber;
    }
  }

  throw new Error('Unable to generate unique e-card number');
}

module.exports = { createUniqueEcardNumber };
