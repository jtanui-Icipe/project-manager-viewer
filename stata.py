import pandas as pd
import sys

filee = sys.argv[1];
file_name  = sys.argv[2]

df = pd.read_csv('./exports/'+file_name+'.csv')
#objects = list(df.select_dtypes(include=["object"]).columns)
#df[objects] = df[objects].astype()
df.to_stata('./exports/'+file_name+'.dta')

#print(objects);