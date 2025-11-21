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
' Category マスタテーブル
' ==============================
entity "CategoryMaster" as CategoryMaster {
    * ID : uuid ("ID")
    --
    Name : string ("名称")
    ParentID : uuid ("親カテゴリID") 
    Level : int ("階層レベル")
    Path : string ("パス") ' 例: /Cat1/Cat2/Cat3
}

' ==============================
' ActionTrigger 型テーブル
' ==============================
entity "ActionTriggerTypes" as ActionTriggerTypes {
    * ID : uuid ("ID")
    --
    ActionType : int ("アクション種別")
    SortOrder : int ("並び順")
    CategoryID : uuid ("カテゴリID（最下層）")
    Name : string ("名称")
    Description : string ("説明")
    Actor : string ("アクター")
    Timing : string ("タイミング")
    TimingDetail : string ("タイミング詳細")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' Artifact 型テーブル
' ==============================
entity "ArtifactTypes" as ArtifactTypes {
    * ID : uuid ("ID")
    --
    SortOrder : int ("並び順")
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
entity "CausalRelationsTypes" as CausalRelationsTypes {
    * ID : uuid ("ID")
    --
    ActionTriggerTypeID : uuid ("業務型ID")
    ArtifactTypeID : uuid ("成果物型ID")
    CrudType : string ("CRUD種別")
    CreateTimestamp : datetime ("作成日時")
    LastUpdatedBy : string ("更新者")
}

' ==============================
' JobTypes テーブル（業務型）
' ==============================
entity "JobTypes" as JobTypes {
    * ID : uuid ("ID")
    --
    CategoryID : uuid ("カテゴリID")
    Name : string ("業務型名称")
    Description : string ("説明")
    SortOrder : int
    CreateTimestamp : datetime
    LastUpdatedBy : string
}

' ==============================
' Cases テーブル（案件）
' ==============================
entity "Cases" as Cases {
    * ID : uuid ("ID")
    --
    OwnerID : uuid ("所有者ID")
    Name : string ("案件名")
    Description : string ("案件詳細")
    StartDate : date
    EndDate : date
    CreateTimestamp : datetime
    LastUpdatedBy : string
}

' ==============================
' CaseJobTypes テーブル（案件と業務型のN:N）
' ==============================
entity "CaseJobTypes" as CaseJobTypes {
    * ID : uuid ("ID")
    --
    CaseID : uuid
    OwnerID : uuid ("所有者ID")
    JobTypeID : uuid
    Notes : string
    CreateTimestamp : datetime
    LastUpdatedBy : string
}

' ==============================
' CaseActionTriggers テーブル（案件で実施したActionTriggerTypesの紐付け）
' ==============================
entity "CaseActionTriggers" as CaseActionTriggers {
    * ID : uuid ("ID")
    --
    CaseJobTypeID : uuid
    OwnerID : uuid ("所有者ID")
    ActionTriggerTypeID : uuid
    ActualPerformer : string
    ActualTiming : string
    Notes : string
    CreateTimestamp : datetime
    LastUpdatedBy : string
}

' ==============================
' CaseArtifacts テーブル（案件での成果物）
' ==============================
entity "CaseArtifacts" as CaseArtifacts {
    * ID : uuid ("ID")
    --
    CaseID : uuid
    OwnerID : uuid ("所有者ID")
    ArtifactTypeID : uuid
    FileName : string ("成果物ファイル名")
    Notes : string
    CreateTimestamp : datetime
    LastUpdatedBy : string
}

' ==============================
' CaseCausalRelations テーブル（案件単位の業務→成果物紐付け）
' ==============================
entity "CaseCausalRelations" as CaseCausalRelations {
    * ID : uuid ("ID")
    --
    OwnerID : uuid ("所有者ID")
    CaseActionTriggerID : uuid
    CaseArtifactID : uuid
    CrudType : string
    CreateTimestamp : datetime
    LastUpdatedBy : string
}

' --- リレーション ---
Users ||--o{ Cases                 : "OwnerID"
Users ||--o{ CaseJobTypes          : "OwnerID"
Users ||--o{ CaseActionTriggers    : "OwnerID"
Users ||--o{ CaseArtifacts         : "OwnerID"
Users ||--o{ CaseCausalRelations   : "OwnerID"

CategoryMaster ||--o{ ActionTriggerTypes : "CategoryID"
CategoryMaster ||--o{ ArtifactTypes      : "CategoryID"
CategoryMaster ||--o{ JobTypes           : "CategoryID"
CategoryMaster ||--o{ CategoryMaster     : "ParentID"

ActionTriggerTypes ||--o{ CausalRelationsTypes : "ActionTriggerTypeID"
ArtifactTypes      ||--o{ CausalRelationsTypes : "ArtifactTypeID"

JobTypes ||--o{ ActionTriggerTypes : "JobTypeID"
JobTypes ||--o{ CaseJobTypes       : "JobTypeID"
CaseJobTypes ||--o{ CaseActionTriggers : "CaseJobTypeID"

Cases ||--o{ CaseJobTypes        : "CaseID"

ActionTriggerTypes ||--o{ CaseActionTriggers : "ActionTriggerTypeID"
ArtifactTypes      ||--o{ CaseArtifacts      : "ArtifactTypeID"

CaseActionTriggers ||--o{ CaseCausalRelations : "CaseActionTriggerID"
CaseArtifacts      ||--o{ CaseCausalRelations : "CaseArtifactID"

@enduml
