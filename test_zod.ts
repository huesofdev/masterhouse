import { z } from 'zod';

const schema = z.string().url();

try {
  schema.parse("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
  console.log("SUCCESS");
} catch (e) {
  console.log("ERROR");
  console.log(e);
}
