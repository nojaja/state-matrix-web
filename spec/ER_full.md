@startuml

' ==============================
' ユーザーテーブル
' ==============================
entity "Users" as Users {
    * ID : uuid ("ID")
    --
    Name : string ("氏名")
    Email : string ("メールアドレス")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' Category マスタテーブル(カテゴリマスタ)
' ==============================
entity "CategoryMaster\n(カテゴリマスタ)" as CategoryMaster {
    * ID : uuid ("カテゴリID")
    --
    Name : string ("名称")
    ParentID : uuid ("親カテゴリID") 
    Level : int ("階層レベル")
    Path : string ("パス") ' 例: /Cat1/Cat2/Cat3
}

' ==============================
' ActionTrigger 型テーブル(実行タイミング型)
' ==============================
entity "ActionTriggerTypes\n(実行タイミング型)" as ActionTriggerTypes {
    * ID : uuid  ("実行タイミング型ID")
    --
    ActionType : int ("アクション種別")
    CategoryID : uuid ("カテゴリID（最下層）")
    ProcessTypeID : uuid ("業務工程型ID")
    Name : string ("名称")
    Description : string ("説明")
    Rollgroup : string ("ロールグループ")
    Timing : string ("タイミング")
    TimingDetail : string ("タイミング詳細")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' Artifact 型テーブル(作成物型)
' ==============================
entity "ArtifactTypes\n(作成物型)" as ArtifactTypes {
    * ID : uuid ("作成物型ID")
    --
    CategoryID : uuid ("カテゴリID（最下層）")
    Name : string ("名称")
    Content : string ("内容")
    Note : string ("備考")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' 型間の関連
' ==============================
entity "CausalRelationsTypes\n(型間の関連)" as CausalRelationsTypes {
    * ID : uuid ("ID")
    --
    ActionTriggerTypeID : uuid ("実行タイミング型ID")
    ArtifactTypeID : uuid ("作成物型ID")
    CrudType : string ("CRUD種別")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' ProcessTypes テーブル（業務工程型）
' ==============================
entity "ProcessTypes\n（業務工程型）" as ProcessTypes {
    * ID : uuid ("業務工程型ID")
    --
    CategoryID : uuid ("カテゴリID（最下層）")
    Name : string ("業務工程名称")
    Description : string ("説明")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' Cases テーブル（案件）
' ==============================
entity "Cases\n（案件）" as Cases {
    * ID : uuid ("案件ID")
    --
    OwnerID : uuid ("所有者ID")
    Name : string ("案件名")
    Description : string ("案件詳細")
    StartDate : date
    EndDate : date
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' CaseProcessTypes テーブル（案件と業務型のN:N）
' ==============================
entity "CaseProcessTypes\n（案件と業務型のN:N）" as CaseProcessTypes {
    * ID : uuid ("ID")
    --
    CaseID : uuid ("案件ID")
    OwnerID : uuid ("所有者ID")
    ProcessTypeID : uuid ("業務工程型ID")
    Notes : string ("備考")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' CaseActionTriggers テーブル（案件で実施したActionTriggerTypesの紐付け）
' ==============================
entity "CaseActionTriggers\n（案件で実施したActionTriggerTypesの紐付け）" as CaseActionTriggers {
    * ID : uuid ("ID")
    --
    CaseProcessTypeID : uuid
    OwnerID : uuid ("所有者ID")
    ActionTriggerTypeID : uuid ("実行タイミング型ID")
    ActualPerformer : string
    ActualTiming : string
    Notes : string ("備考")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' CaseArtifacts テーブル（案件での作成物）
' ==============================
entity "CaseArtifacts\n（案件での作成物）" as CaseArtifacts {
    * ID : uuid ("ID")
    --
    CaseID : uuid
    OwnerID : uuid ("所有者ID")
    ArtifactTypeID : uuid ("作成物型ID")
    FileName : string ("作成物ファイル名")
    Notes : string ("備考")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' CaseCausalRelations テーブル（案件単位の業務→作成物紐付け）
' ==============================
entity "CaseCausalRelations\n(案件単位の業務→作成物紐付け)" as CaseCausalRelations {
    * ID : uuid ("ID")
    --
    OwnerID : uuid ("所有者ID")
    CaseActionTriggerID : uuid
    CaseArtifactID : uuid
    CrudType : string ("CRUD種別")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' --- リレーション ---
Users ||--o{ Cases                 : "OwnerID"
Users ||--o{ CaseProcessTypes          : "OwnerID"
Users ||--o{ CaseActionTriggers    : "OwnerID"
Users ||--o{ CaseArtifacts         : "OwnerID"
Users ||--o{ CaseCausalRelations   : "OwnerID"

CategoryMaster ||--o{ ActionTriggerTypes : "CategoryID"
CategoryMaster ||--o{ ArtifactTypes      : "CategoryID"
CategoryMaster ||--o{ ProcessTypes           : "CategoryID"
CategoryMaster ||--o{ CategoryMaster     : "ParentID"

ActionTriggerTypes ||--o{ CausalRelationsTypes : "ActionTriggerTypeID"
ArtifactTypes      ||--o{ CausalRelationsTypes : "ArtifactTypeID"

ProcessTypes ||--o{ ActionTriggerTypes : "ProcessTypeID"
ProcessTypes ||--o{ CaseProcessTypes       : "ProcessTypeID"
CaseProcessTypes ||--o{ CaseActionTriggers : "CaseProcessTypeID"

Cases ||--o{ CaseProcessTypes        : "CaseID"

ActionTriggerTypes ||--o{ CaseActionTriggers : "ActionTriggerTypeID"
ArtifactTypes      ||--o{ CaseArtifacts      : "ArtifactTypeID"

CaseActionTriggers ||--o{ CaseCausalRelations : "CaseActionTriggerID"
CaseArtifacts      ||--o{ CaseCausalRelations : "CaseArtifactID"

@enduml
