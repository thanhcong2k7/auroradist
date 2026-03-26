import placeholderImage from "@/components/undefined.png";
export const getResizedImage = (url: string | undefined, size: number = 200) => {
  if (!url) return placeholderImage;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=webp`;
};
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }
  canvas.width = 500;
  canvas.height = 500;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    500,
    500
  );
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return;
        }
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      0.8
    );
  });
}
export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return 'Error Date';
  }
};
export const getAudioDuration = (file: File, url="nothinghere"): Promise<string> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio(objectUrl);

    audio.onloadedmetadata = () => {
      const totalSeconds = Math.floor(audio.duration);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const formatted = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      
      URL.revokeObjectURL(objectUrl);
      resolve(formatted);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('00:00');
    };
  });
};
// utils/customError.js
export class APIError extends Error {
  statusCode: any;
  constructor(message, statusCode) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}
export const ACRScanner = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio(objectUrl);

    audio.onloadedmetadata = async () => {
      try {
        const arrayBuffer = await fetch(objectUrl).then(r => r.arrayBuffer());
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const method = 'POST';
        const httpUrlPath = '/v1/identify';
        const sigVersion = '1';
        const accessKey = process.env.REACT_APP_ACR_ACCESS_KEY || '';
        const accessSecret = process.env.REACT_APP_ACR_ACCESS_SECRET || '';
        const host = process.env.REACT_APP_ACR_HOST || '';

        const sigStr = `${method}\n${httpUrlPath}\n${accessKey}\naudio\n${sigVersion}\n${timestamp}`;
        const signature = await generateSignature(sigStr, accessSecret);

        const formData = new FormData();
        formData.append('access_key', accessKey);
        formData.append('sample_bytes', arrayBuffer.byteLength.toString());
        formData.append('sample', new Blob([arrayBuffer]));
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('data_type', 'audio');
        formData.append('signature_version', sigVersion);

        const response = await fetch(`http://${host}/v1/identify`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.text();
        URL.revokeObjectURL(objectUrl);
        resolve(result);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        resolve(JSON.stringify({ status: { msg: 'Failed', code: 0 } }));
      }
    };

    async function generateSignature(data: string, key: string): Promise<string> {
      const encoder = new TextEncoder();
      const keyBuffer = encoder.encode(key);
      const dataBuffer = encoder.encode(data);
      const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
      return btoa(String.fromCharCode(...new Uint8Array(signature)));
    }
  });
}


// using System;
// using System.Collections.Generic;
// using System.IO;
// using System.Net;
// using System.Security.Cryptography;
// using System.Text;
// using System.Threading.Tasks;

// namespace ACRTool
// {
// 	/// <summary>
// 	/// Description of AcrCloudIdentify.
// 	/// </summary>
// 	public class AcrCloudIdentify
// 	{
// 		// Configuration
//         private const string RequestUrlPath = "/v1/identify";
//         private const string SignatureVersion = "1";
//         private const string HttpMethod = "POST";
//         private const string DataType = "audio";

//         private readonly int _timeoutMs;
        
//         public string _host = GlobalVariables.host;
//         public string _accessKey = GlobalVariables.accesskey;
//         public string _accessSecret = GlobalVariables.accesssecret;
//         private string orgF;
//         public AcrCloudIdentify(string fileDir, int timeoutMs = 10000)
//         {
//             _timeoutMs = timeoutMs;
//             orgF = fileDir;
//         }
//         public void ProcessDirectory(string directoryPath, string searchPattern = "*.*")
//         {
//             if (!Directory.Exists(directoryPath))
//             {
//                 Console.WriteLine("Error: Directory not found: " + directoryPath);
//                 return;
//             }

//             string[] files = Directory.GetFiles(directoryPath, searchPattern);

//             if (files.Length == 0)
//             {
//                 Console.WriteLine("No files found in the directory.");
//                 return;
//             }

//             Console.WriteLine("Found " + files.Length + " files in " + directoryPath + "...");

//             foreach (string filePath in files)
//             {
//                 Console.WriteLine("\nProcessing: " + Path.GetFileName(filePath));
//                 try
//                 {
//                     byte[] fileData = File.ReadAllBytes(filePath);
//                     string result = Recognize(_host, _accessKey, _accessSecret, fileData, "audio", _timeoutMs);
//                     Console.WriteLine("Result: " + result);
//                 }
//                 catch (Exception ex)
//                 {
//                     Console.WriteLine("Error processing file: " + ex.Message);
//                 }
//             }
//         }
//         public string Scan(){
// 			try {
// 				byte[] fileData = File.ReadAllBytes(orgF);
// 				return Recognize(_host, _accessKey, _accessSecret, fileData, "audio", _timeoutMs);
// 			} catch (Exception e) {
//         		return "{\"status\":{ \"msg\": \"Failed - "+e.ToString()+"\", \"code\": 0, \"version\": \"1.0\" }}";
// 				//{ "msg": "Success", "code": 0, "version": "1.0" }
// 			}
//         }

//         public string Recognize(string host, string accessKey, string secretKey, byte[] queryData, string queryType, int timeout)
//         {
// 			const string method = "POST";
// 			const string httpUrlPath = "/v1/identify";
// 			const string sigVersion = "1";
//             string timestamp = GetUtcTimeSeconds();

//             string reqURL = "http://" + host + httpUrlPath;

//             string sigStr = method + "\n" + httpUrlPath + "\n" + accessKey + "\n" + queryType + "\n" + sigVersion + "\n" + timestamp;
//             string signature = EncryptByHMACSHA1(sigStr, secretKey);

//             var postParams = new Dictionary<string, object>();
//             postParams.Add("access_key", accessKey);
//             postParams.Add("sample_bytes", queryData.Length.ToString());
//             postParams.Add("sample", queryData); // The file bytes
//             postParams.Add("timestamp", timestamp);
//             postParams.Add("signature", signature);
//             postParams.Add("data_type", queryType);
//             postParams.Add("signature_version", sigVersion);

//             return PostHttp(reqURL, postParams, timeout);
//         }

//         private string PostHttp(string url, Dictionary<string, object> parameters, int timeout)
//         {
//             string boundary = "---------------------------" + DateTime.Now.Ticks.ToString("x");
//             byte[] boundarybytes = Encoding.ASCII.GetBytes("\r\n--" + boundary + "\r\n");
//             byte[] endBoundaryBytes = Encoding.ASCII.GetBytes("\r\n--" + boundary + "--\r\n");

//             HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
//             request.ContentType = "multipart/form-data; boundary=" + boundary;
//             request.Method = "POST";
//             request.KeepAlive = true;
//             request.Timeout = timeout;
//             request.Credentials = CredentialCache.DefaultCredentials;

//             try
//             {
//                 using (Stream requestStream = request.GetRequestStream())
//                 {
// 					const string formdataTemplate = "Content-Disposition: form-data; name=\"{0}\"\r\n\r\n{1}";

//                     foreach (KeyValuePair<string, object> param in parameters)
//                     {
//                         requestStream.Write(boundarybytes, 0, boundarybytes.Length);
                        
//                         if (param.Value is byte[])
//                         {
//                             // It's the file
// 							const string headerTemplate = "Content-Disposition: form-data; name=\"{0}\"; filename=\"sample\"\r\nContent-Type: application/octet-stream\r\n\r\n";
//                             string header = string.Format(headerTemplate, param.Key);
//                             byte[] headerbytes = Encoding.UTF8.GetBytes(header);
//                             requestStream.Write(headerbytes, 0, headerbytes.Length);

//                             byte[] fileData = (byte[])param.Value;
//                             requestStream.Write(fileData, 0, fileData.Length);
//                         }
//                         else
//                         {
//                             // It's a string parameter
//                             string formitem = string.Format(formdataTemplate, param.Key, param.Value);
//                             byte[] formitembytes = Encoding.UTF8.GetBytes(formitem);
//                             requestStream.Write(formitembytes, 0, formitembytes.Length);
//                         }
//                     }
//                     requestStream.Write(endBoundaryBytes, 0, endBoundaryBytes.Length);
//                 }

//                 using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
//                 {
//                     using (Stream stream = response.GetResponseStream())
//                     using (StreamReader reader = new StreamReader(stream))
//                     {
//                         return reader.ReadToEnd();
//                     }
//                 }
//             }
//             catch (WebException wex)
//             {
//                 if (wex.Response != null)
//                 {
//                     using (Stream errorStream = wex.Response.GetResponseStream())
//                     using (StreamReader reader = new StreamReader(errorStream))
//                     {
//                         return "HTTP Error: " + reader.ReadToEnd();
//                     }
//                 }
//                 return "Error: " + wex.Message;
//             }
//             catch (Exception ex)
//             {
//                 return "Error: " + ex.Message;
//             }
//         }


//         private string EncryptByHMACSHA1(string data, string key)
//         {
//             using (var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(key)))
//             {
//                 byte[] hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
//                 return Convert.ToBase64String(hashBytes);
//             }
//         }

//         private string GetUtcTimeSeconds()
//         {
//             return DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
//         }
// 	}
// }